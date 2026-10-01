import { useCallback, useEffect, useMemo, useState } from 'react';
import { Airplane, CaretLeft, CaretRight, Check, CircleNotch, Money, PiggyBank, Plus, Repeat, ShoppingBag } from '@phosphor-icons/react';
import { ScreenHeader } from './ui/ScreenHeader';
import { Sheet } from './ui/Sheet';
import { ProgressBar } from './ui/ProgressBar';
import { useHeldValue } from './ui/useHeldValue';
import { ConfirmDialog } from './ConfirmDialog';
import { CurrencyInput } from './CurrencyInput';
import { API_URL } from '../config/api';
import { formatCurrency, numberOrZero } from '../utils/helpers';
import { getCurrentMonthKey, monthKeyToLabel, shiftMonthKey } from '../utils/budgetHelpers';

const TOKEN_KEY = 'splitit_jwt';

// Cada sección tiene su color y su ícono: se leen de un vistazo sin etiqueta.
const SECTIONS = [
    { id: 'tracked_expense', title: 'Día a día', long: 'Gastos del día a día', empty: 'Comida, salidas, transporte.', addLabel: 'Agregar gasto', budgeted: true, grad: 'tile-violet', icon: ShoppingBag, bubble: ['var(--card-tint)', 'var(--primary)'] },
    { id: 'fixed_expense', title: 'Fijos', long: 'Gastos fijos', empty: 'Arriendo, servicios, cuotas: lo que se repite cada mes.', addLabel: 'Agregar gasto fijo', budgeted: true, grad: 'tile-lilac', icon: Repeat, bubble: ['var(--card-tint)', 'var(--primary)'] },
    { id: 'income', title: 'Ingresos', long: 'Ingresos', empty: 'Aún no registras ingresos este mes.', addLabel: 'Agregar ingreso', grad: 'tile-teal', icon: Money, bubble: ['var(--pos-soft)', 'var(--pos)'] },
    { id: 'saving', title: 'Ahorros', long: 'Ahorros', empty: 'Aparta dinero para una meta. No cuenta como dinero para gastar.', addLabel: 'Agregar ahorro', grad: 'tile-teal', icon: PiggyBank, bubble: ['var(--pos-soft)', 'var(--pos)'] },
    { id: 'debt', title: 'Deudas', long: 'Pagos de deudas', empty: 'Aquí aparecen los pagos que registras en Cuentas, en Debo.', grad: 'tile-coral', icon: Airplane, bubble: ['var(--neg-soft)', 'var(--neg)'] },
];

const api = async (path, method = 'GET', body) => {
    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
    return json;
};

const syncTag = (item) => {
    if (item.is_split_synced) return 'Gasto compartido';
    if (item.libreta_entry_id) return 'Abono recibido';
    if (item.debt_entry_id) return 'Pago de deuda';
    return '';
};
const isReadOnly = (item) => Boolean(item.is_split_synced || item.libreta_entry_id || item.debt_entry_id);

const ItemRow = ({ item, section, onOpen }) => {
    const actual = numberOrZero(item.actual_amount);
    const planned = numberOrZero(item.budgeted_amount);
    const tag = syncTag(item);
    const pending = item.is_pending;
    const showBar = section.budgeted && planned > 0 && !pending;
    const pct = showBar ? (actual / planned) * 100 : 0;
    const over = showBar && actual > planned;
    const Icon = section.icon;

    let sub = tag;
    if (pending) sub = `${tag || 'Pendiente'} · aún no lo pagas`;
    else if (!tag && section.budgeted && planned > 0) sub = over ? `Te pasaste ${formatCurrency(actual - planned)}` : `Quedan ${formatCurrency(planned - actual)}`;
    else if (!tag && section.id === 'income' && planned > 0 && planned !== actual) sub = `Esperado ${formatCurrency(planned)}`;

    return (
        <button type="button" className="row" onClick={() => onOpen(item)} style={{ flexWrap: 'wrap', opacity: pending ? 0.6 : 1 }}>
            <span className="bubble h-12 w-12" style={{ background: section.bubble[0], color: section.bubble[1] }}><Icon size={24} weight="duotone" /></span>
            <span className="min-w-0 flex-1">
                <span className="body block truncate font-semibold">{item.label}</span>
                {sub && <span className="small block truncate" style={over ? { color: 'var(--neg)' } : undefined}>{sub}</span>}
            </span>
            <span className="shrink-0 text-right">
                <span className="money block">{formatCurrency(actual)}</span>
                {section.budgeted && planned > 0 && <span className="tiny block">de {formatCurrency(planned)}</span>}
            </span>
            <CaretRight size={16} weight="bold" style={{ color: 'var(--ink-3)' }} className="shrink-0" />
            {showBar && <span className="block w-full pt-1"><ProgressBar pct={pct} tone={over ? 'neg' : 'primary'} height={7} /></span>}
        </button>
    );
};

// ---------- Hoja de edición de un movimiento ----------
const ItemSheet = ({ item: liveItem, savings, onClose, onChanged, onViewExpense, onViewAccounts }) => {
    const item = useHeldValue(liveItem);
    const [label, setLabel] = useState('');
    const [planned, setPlanned] = useState('');
    const [actual, setActual] = useState('');
    const [linkId, setLinkId] = useState(null);
    const [contribute, setContribute] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [showDelete, setShowDelete] = useState(false);

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!liveItem) return;
        setLabel(liveItem.label);
        setPlanned(String(numberOrZero(liveItem.budgeted_amount)));
        setActual(String(numberOrZero(liveItem.actual_amount)));
        setLinkId(liveItem.linked_saving_item_id || null);
        setContribute('');
        setError('');
    }, [liveItem?.id]); // eslint-disable-line react-hooks/exhaustive-deps
    /* eslint-enable react-hooks/set-state-in-effect */

    if (!item) return null;

    const sectionId = item.__section;
    const readOnly = isReadOnly(item);
    const canLink = !readOnly && (sectionId === 'fixed_expense' || sectionId === 'tracked_expense');
    const run = async (fn, { close = true } = {}) => {
        setBusy(true);
        setError('');
        try { await fn(); await onChanged(); if (close) onClose(); } catch (err) { setError(err.message); } finally { setBusy(false); }
    };

    const save = () => run(() => api(`/budget/items/${item.id}`, 'PATCH', {
        label: label.trim(),
        budgeted_amount: Number(planned) || 0,
        actual_amount: Number(actual) || 0,
        ...(canLink ? { link_to_saving_item_id: linkId } : {}),
    }));

    return (
        <>
            <Sheet isOpen={Boolean(liveItem)} onClose={onClose} title={readOnly ? 'Movimiento' : 'Editar movimiento'} closeLabel="Cerrar">
                {readOnly ? (
                    <>
                        <div className="py-3">
                            <h3 className="title">{item.label}</h3>
                            <p className="money-lg mt-1">{formatCurrency(item.actual_amount)}</p>
                            <p className="small mt-1">{syncTag(item)}{item.is_pending ? ' · aún no lo pagas' : ''}</p>
                        </div>
                        <p className="small rounded-[16px] p-3" style={{ background: 'var(--card-soft)' }}>
                            Este movimiento se crea solo desde {item.is_split_synced ? 'un gasto compartido' : 'Cuentas'}, así que aquí no se edita: cámbialo en su origen y se actualiza solo.
                        </p>
                        <div className="mt-5">
                            {item.is_split_synced ? (
                                <button type="button" className="btn btn-primary btn-block" onClick={() => { onClose(); onViewExpense(item.split_expense_id); }}>Ver el gasto</button>
                            ) : (
                                <button type="button" className="btn btn-primary btn-block" onClick={() => { onClose(); onViewAccounts(); }}>Ir a Cuentas</button>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="space-y-4">
                            <div>
                                <label className="field-label" htmlFor="bi-label">Nombre</label>
                                <input id="bi-label" className="field" value={label} onChange={(e) => setLabel(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="field-label" htmlFor="bi-planned">Presupuestado</label>
                                    <CurrencyInput id="bi-planned" className="field" value={planned} onChange={setPlanned} />
                                </div>
                                <div>
                                    <label className="field-label" htmlFor="bi-actual">Real</label>
                                    <CurrencyInput id="bi-actual" className="field" value={actual} onChange={setActual} />
                                </div>
                            </div>
                            <p className="small px-1">Presupuestado es lo que planeaste; Real, lo que de verdad pasó. Los totales usan Real.</p>
                        </div>

                        {sectionId === 'saving' && (
                            <>
                                <p className="heading px-1 pb-3 pt-6">Abonar a este ahorro</p>
                                <div className="flex items-center gap-2">
                                    <CurrencyInput className="field" value={contribute} onChange={setContribute} />
                                    <button type="button" className="btn btn-tinted shrink-0" disabled={busy || !(Number(contribute) > 0)} onClick={() => run(() => api(`/budget/items/${item.id}/contribute`, 'PATCH', { amount: Number(contribute) }))}>Abonar</button>
                                </div>
                            </>
                        )}

                        {canLink && savings.length > 0 && (
                            <>
                                <p className="heading px-1 pb-3 pt-6">Apartar a un ahorro</p>
                                <div className="stack">
                                    {[{ id: null, label: 'Ninguno' }, ...savings].map((s) => (
                                        <button key={s.id ?? 'none'} type="button" className="row" style={{ minHeight: 52 }} onClick={() => setLinkId(s.id)} role="radio" aria-checked={linkId === s.id}>
                                            <span className="body flex-1">{s.label}</span>
                                            {linkId === s.id && <Check size={20} weight="bold" style={{ color: 'var(--primary)' }} />}
                                        </button>
                                    ))}
                                </div>
                                <p className="small mt-2 px-1">Lo que gastes aquí también suma a ese ahorro.</p>
                            </>
                        )}

                        {error && <p className="small mt-4 rounded-[16px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button type="button" className="btn btn-danger" onClick={() => setShowDelete(true)}>Eliminar</button>
                            <button type="button" className="btn btn-primary" disabled={busy || !label.trim()} onClick={save}>
                                {busy ? <CircleNotch size={18} className="animate-spin" /> : 'Guardar'}
                            </button>
                        </div>
                    </>
                )}
            </Sheet>

            <ConfirmDialog
                isOpen={showDelete}
                tone="danger"
                title={`¿Eliminar “${item.label}”?`}
                message="Se quita de tu presupuesto de este mes."
                confirmLabel="Eliminar"
                isLoading={busy}
                onConfirm={() => run(async () => { await api(`/budget/items/${item.id}`, 'DELETE'); setShowDelete(false); })}
                onCancel={() => setShowDelete(false)}
            />
        </>
    );
};

// ---------- Saldos iniciales ----------
const OpeningSheet = ({ isOpen, opening, monthKey, onClose, onChanged }) => {
    const [cash, setCash] = useState('');
    const [savings, setSavings] = useState('');
    const [debt, setDebt] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen || !opening) return;
        setCash(String(opening.cash_balance)); setSavings(String(opening.savings_balance)); setDebt(String(opening.debt_balance)); setError('');
    }, [isOpen, opening]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const save = async () => {
        setBusy(true); setError('');
        try {
            await api(`/budget/${monthKey}/opening`, 'PATCH', { cash_balance: Number(cash) || 0, savings_balance: Number(savings) || 0, debt_balance: Number(debt) || 0 });
            await onChanged();
            onClose();
        } catch (err) { setError(err.message); } finally { setBusy(false); }
    };

    return (
        <Sheet isOpen={isOpen} onClose={onClose} title="Saldos iniciales">
            <p className="small pb-4">Con cuánto empiezas este mes. Corrígelos si no coinciden con lo que de verdad tienes: de aquí parte todo el cálculo.</p>
            <div className="space-y-4">
                <div><label className="field-label" htmlFor="op-cash">Dinero en caja (banco y efectivo)</label><CurrencyInput id="op-cash" className="field" value={cash} onChange={setCash} /></div>
                <div><label className="field-label" htmlFor="op-sav">Ahorros ya juntados</label><CurrencyInput id="op-sav" className="field" value={savings} onChange={setSavings} /></div>
                <div><label className="field-label" htmlFor="op-debt">Deuda total pendiente</label><CurrencyInput id="op-debt" className="field" value={debt} onChange={setDebt} /></div>
            </div>
            {error && <p className="small mt-4 rounded-[16px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}
            <button type="button" className="btn btn-primary btn-block mt-6" disabled={busy} onClick={save}>{busy ? <CircleNotch size={18} className="animate-spin" /> : 'Guardar'}</button>
        </Sheet>
    );
};

const Line = ({ label, value, sign, strong, onClick, hint }) => {
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag type={onClick ? 'button' : undefined} onClick={onClick} className="flex w-full items-center gap-3 px-5 py-3.5 text-left" style={{ borderTop: '1px solid var(--line)' }}>
            <span className="min-w-0 flex-1">
                <span className={`block ${strong ? 'heading' : 'body'}`}>{sign && <span className="mr-2" style={{ color: 'var(--ink-3)' }}>{sign}</span>}{label}</span>
                {hint && <span className="tiny block">{hint}</span>}
            </span>
            <span className="money">{formatCurrency(value)}</span>
            {onClick && <CaretRight size={14} weight="bold" style={{ color: 'var(--ink-3)' }} />}
        </Tag>
    );
};

export const BudgetView = ({ onAddToSection, onViewSyncedExpense, onViewAccounts, refreshKey }) => {
    const [monthKey, setMonthKey] = useState(() => getCurrentMonthKey());
    const [direction, setDirection] = useState('forward');
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [openId, setOpenId] = useState(null);
    const [showOpening, setShowOpening] = useState(false);
    const [sectionId, setSectionId] = useState('tracked_expense');

    const load = useCallback(async (key) => {
        try { setData(await api(`/budget/${key}`)); setError(''); } catch (err) { setError(err.message); }
    }, []);

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => { load(monthKey); }, [monthKey, load, refreshKey]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const go = (delta) => { setDirection(delta > 0 ? 'forward' : 'back'); setMonthKey((k) => shiftMonthKey(k, delta)); };

    const allItems = useMemo(() => (data ? Object.entries(data.sections).flatMap(([sid, s]) => s.items.map((i) => ({ ...i, __section: sid }))) : []), [data]);
    const openItem = allItems.find((i) => i.id === openId) || null;
    const savingsChoices = useMemo(() => (data ? data.sections.saving.items.filter((i) => !i.is_split_synced) : []), [data]);
    const anim = direction === 'forward' ? 'animate-month-in-forward' : 'animate-month-in-back';

    const section = SECTIONS.find((s) => s.id === sectionId);
    const planned = data ? data.sections.fixed_expense.budgeted_total + data.sections.tracked_expense.budgeted_total : 0;
    const spent = data ? data.sections.fixed_expense.actual_total + data.sections.tracked_expense.actual_total : 0;

    return (
        <section>
            <ScreenHeader title="Presupuesto" subtitle="Lo planeado contra lo que de verdad pasó" />

            <div className="card flex items-center justify-between p-1.5">
                <button type="button" onClick={() => go(-1)} className="btn btn-icon" aria-label="Mes anterior" style={{ boxShadow: 'none', background: 'var(--card-soft)' }}><CaretLeft size={20} weight="bold" /></button>
                <span key={monthKey} className={`heading ${anim}`}>{monthKeyToLabel(monthKey)}</span>
                <button type="button" onClick={() => go(1)} className="btn btn-icon" aria-label="Mes siguiente" style={{ boxShadow: 'none', background: 'var(--card-soft)' }}><CaretRight size={20} weight="bold" /></button>
            </div>

            {error && <p className="small mt-4 rounded-[16px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}
            {!data && !error && <div className="flex justify-center py-20"><CircleNotch size={26} className="animate-spin" style={{ color: 'var(--ink-3)' }} /></div>}

            {data && (
                <div key={monthKey} className={`${anim} mt-5 flex flex-col gap-5`}>
                    <div className="hero p-6">
                        <p className="small">Disponible para gastar</p>
                        <p className="money-xl mt-2">{formatCurrency(data.totals.actual_net)}</p>
                        <p className="small mt-2">Ingresos menos gastos de este mes. No cuenta ahorros ni lo que aún no te pagan.{data.totals.weekly_actual > 0 ? ` Unos ${formatCurrency(data.totals.weekly_actual)} por semana.` : ''}</p>
                        {planned > 0 && (
                            <div className="mt-5">
                                <div className="mb-2 flex justify-between text-[13px]"><span>Gastaste {formatCurrency(spent)}</span><span style={{ opacity: 0.8 }}>de {formatCurrency(planned)}</span></div>
                                <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.22)' }}>
                                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (spent / planned) * 100)}%`, background: spent > planned ? 'var(--grad-coral)' : '#fff', transition: 'width 800ms var(--ease-ios)' }} />
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <h2 className="title mb-3">Tus categorías</h2>
                        <div className="snap-x-row scrollbar-hide">
                            {SECTIONS.map((s) => {
                                const active = s.id === sectionId;
                                const Icon = s.icon;
                                return (
                                    <button
                                        key={s.id}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => setSectionId(s.id)}
                                        className={`tile ${s.grad} flex h-[124px] w-[132px] flex-col justify-between p-3.5 text-left transition-all active:scale-95`}
                                        style={{ opacity: active ? 1 : 0.55, transform: active ? 'translateY(-3px)' : 'none', boxShadow: active ? '0 16px 26px -14px rgba(60,30,160,0.6)' : 'none', transitionTimingFunction: 'var(--spring)', transitionDuration: '320ms' }}
                                    >
                                        <span className="bubble h-9 w-9 rounded-full" style={{ background: 'rgba(255,255,255,0.28)' }}><Icon size={20} weight="fill" /></span>
                                        <span>
                                            <span className="block text-[13px] font-semibold leading-tight">{s.title}</span>
                                            <span className="money block text-[17px]">{formatCurrency(data.sections[s.id].actual_total)}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="title">{section.long}</h2>
                            {section.addLabel && (
                                <button type="button" className="btn btn-tinted btn-sm" onClick={() => onAddToSection(section.id)}><Plus size={14} weight="bold" /> Agregar</button>
                            )}
                        </div>
                        {data.sections[section.id].items.length === 0 ? (
                            <div className="card px-5 py-6"><p className="small">{section.empty}</p></div>
                        ) : (
                            <div className="stack">{data.sections[section.id].items.map((i) => <ItemRow key={i.id} item={i} section={section} onOpen={(it) => setOpenId(it.id)} />)}</div>
                        )}
                    </div>

                    <div>
                        <h2 className="title mb-3">Flujo de caja</h2>
                        <div className="card overflow-hidden">
                            <Line label="Saldo anterior" value={data.opening.cash_balance} onClick={() => setShowOpening(true)} hint="Con cuánto empezaste el mes" />
                            <Line label="Ingresos" sign="+" value={data.sections.income.actual_total} />
                            <Line label="Gastos fijos" sign="−" value={data.sections.fixed_expense.actual_total} />
                            <Line label="Gastos del día a día" sign="−" value={data.sections.tracked_expense.actual_total} />
                            <Line label="Ahorros" sign="+" value={data.sections.saving.actual_total} hint="Se suman de vuelta: el gasto vinculado ya los restó" />
                            <Line label="Pagos de deudas" sign="−" value={data.sections.debt.actual_total} />
                            <div className="flex items-center justify-between px-5 py-4" style={{ background: 'var(--card-tint)' }}>
                                <span className="heading">Caja al cierre</span>
                                <span className="money-lg" style={{ color: 'var(--primary)' }}>{formatCurrency(data.totals.balance)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => setShowOpening(true)} className="card p-4 text-left transition-transform active:scale-[0.97]">
                            <span className="small block">Ahorros acumulados</span>
                            <span className="money-lg block" style={{ color: 'var(--pos)' }}>{formatCurrency(data.totals.savings_balance)}</span>
                        </button>
                        <button type="button" onClick={() => setShowOpening(true)} className="card p-4 text-left transition-transform active:scale-[0.97]">
                            <span className="small block">Deuda pendiente</span>
                            <span className="money-lg block" style={{ color: 'var(--neg)' }}>{formatCurrency(data.totals.debt_balance)}</span>
                        </button>
                    </div>
                </div>
            )}

            <ItemSheet
                item={openItem}
                savings={savingsChoices.filter((s) => s.id !== openItem?.id)}
                onClose={() => setOpenId(null)}
                onChanged={() => load(monthKey)}
                onViewExpense={onViewSyncedExpense}
                onViewAccounts={onViewAccounts}
            />
            <OpeningSheet isOpen={showOpening} opening={data?.opening} monthKey={monthKey} onClose={() => setShowOpening(false)} onChanged={() => load(monthKey)} />
        </section>
    );
};
