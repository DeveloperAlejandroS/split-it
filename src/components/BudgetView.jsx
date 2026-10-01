import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import { ScreenHeader, NavAction } from './ui/ScreenHeader';
import { EmptyState } from './ui/EmptyState';
import { Sheet } from './ui/Sheet';
import { useHeldValue } from './ui/useHeldValue';
import { ConfirmDialog } from './ConfirmDialog';
import { CurrencyInput } from './CurrencyInput';
import { API_URL } from '../config/api';
import { formatCurrency, numberOrZero } from '../utils/helpers';
import { getCurrentMonthKey, monthKeyToLabel, shiftMonthKey } from '../utils/budgetHelpers';

const TOKEN_KEY = 'splitit_jwt';

const SECTIONS = [
    { id: 'income', title: 'Ingresos', empty: 'Aún no registras ingresos este mes.', addLabel: 'Agregar ingreso', tone: 'in' },
    { id: 'fixed_expense', title: 'Gastos fijos', empty: 'Arriendo, servicios, cuotas: lo que se repite cada mes.', addLabel: 'Agregar gasto fijo', tone: 'out', budgeted: true },
    { id: 'tracked_expense', title: 'Gastos del día a día', empty: 'Comida, salidas, transporte.', addLabel: 'Agregar gasto', tone: 'out', budgeted: true },
    { id: 'saving', title: 'Ahorros', empty: 'Aparta dinero para una meta. No cuenta como dinero para gastar.', addLabel: 'Agregar ahorro', tone: 'save' },
    { id: 'debt', title: 'Pagos de deudas', empty: 'Aquí aparecen los pagos que registras en Cuentas → Debo.', tone: 'out' },
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

// ---------- Fila de movimiento ----------
const ItemRow = ({ item, section, onOpen }) => {
    const actual = numberOrZero(item.actual_amount);
    const planned = numberOrZero(item.budgeted_amount);
    const tag = syncTag(item);
    const pending = item.is_pending;
    const showBar = section.budgeted && planned > 0 && !pending;
    const pct = showBar ? Math.min(100, (actual / planned) * 100) : 0;
    const over = showBar && actual > planned;

    let sub = tag;
    if (pending) sub = `${tag || 'Pendiente'} · aún no lo pagas`;
    else if (!tag && section.budgeted && planned > 0) sub = over ? `Te pasaste ${formatCurrency(actual - planned)}` : `Quedan ${formatCurrency(planned - actual)}`;
    else if (!tag && section.id === 'income' && planned > 0 && planned !== actual) sub = `Esperado ${formatCurrency(planned)}`;

    return (
        <button type="button" className="ios-row" onClick={() => onOpen(item)} style={pending ? { opacity: 0.6 } : undefined}>
            <span className="min-w-0 flex-1">
                <span className="t-body block truncate font-medium">{item.label}</span>
                {sub && <span className="t-footnote block truncate" style={{ color: over ? 'var(--danger)' : 'var(--text-secondary)' }}>{sub}</span>}
                {showBar && (
                    <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full" style={{ background: 'var(--fill)' }}>
                        <span className="block h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: over ? 'var(--danger)' : 'var(--accent)' }} />
                    </span>
                )}
            </span>
            <span className="shrink-0 text-right">
                <span className="t-headline tabular block">{formatCurrency(actual)}</span>
                {section.budgeted && planned > 0 && <span className="t-caption block text-secondary">de {formatCurrency(planned)}</span>}
            </span>
            <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
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
                            <h3 className="t-title">{item.label}</h3>
                            <p className="t-money-lg mt-1">{formatCurrency(item.actual_amount)}</p>
                            <p className="t-subhead mt-1 text-secondary">{syncTag(item)}{item.is_pending ? ' · aún no lo pagas' : ''}</p>
                        </div>
                        <p className="t-subhead rounded-[12px] p-3 text-secondary" style={{ background: 'var(--fill)' }}>
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
                            <p className="t-footnote px-1 text-secondary">Presupuestado es lo que planeaste; Real, lo que de verdad pasó. Los totales usan Real.</p>
                        </div>

                        {sectionId === 'saving' && (
                            <>
                                <p className="t-section px-4 pb-2 pt-6">Abonar a este ahorro</p>
                                <div className="flex items-center gap-2">
                                    <CurrencyInput className="field" value={contribute} onChange={setContribute} />
                                    <button type="button" className="btn btn-tinted shrink-0" disabled={busy || !(Number(contribute) > 0)} onClick={() => run(() => api(`/budget/items/${item.id}/contribute`, 'PATCH', { amount: Number(contribute) }))}>Abonar</button>
                                </div>
                            </>
                        )}

                        {canLink && savings.length > 0 && (
                            <>
                                <p className="t-section px-4 pb-2 pt-6">Apartar a un ahorro</p>
                                <div className="ios-group">
                                    {[{ id: null, label: 'Ninguno' }, ...savings].map((s) => (
                                        <button key={s.id ?? 'none'} type="button" className="ios-row" onClick={() => setLinkId(s.id)} role="radio" aria-checked={linkId === s.id}>
                                            <span className="t-body flex-1">{s.label}</span>
                                            {linkId === s.id && <Check size={20} style={{ color: 'var(--accent)' }} strokeWidth={2.6} />}
                                        </button>
                                    ))}
                                </div>
                                <p className="t-footnote mt-2 px-1 text-secondary">Lo que gastes aquí también suma a ese ahorro.</p>
                            </>
                        )}

                        {error && <p className="t-subhead mt-4 rounded-[12px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button type="button" className="btn btn-danger" onClick={() => setShowDelete(true)}>Eliminar</button>
                            <button type="button" className="btn btn-primary" disabled={busy || !label.trim()} onClick={save}>
                                {busy ? <Loader2 size={18} className="animate-spin" /> : 'Guardar'}
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
            <p className="t-subhead pb-4 text-secondary">Con cuánto empiezas este mes. Corrígelos si no coinciden con lo que de verdad tienes: de aquí parte todo el cálculo.</p>
            <div className="space-y-4">
                <div><label className="field-label" htmlFor="op-cash">Dinero en caja (banco y efectivo)</label><CurrencyInput id="op-cash" className="field" value={cash} onChange={setCash} /></div>
                <div><label className="field-label" htmlFor="op-sav">Ahorros ya juntados</label><CurrencyInput id="op-sav" className="field" value={savings} onChange={setSavings} /></div>
                <div><label className="field-label" htmlFor="op-debt">Deuda total pendiente</label><CurrencyInput id="op-debt" className="field" value={debt} onChange={setDebt} /></div>
            </div>
            {error && <p className="t-subhead mt-4 rounded-[12px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}
            <button type="button" className="btn btn-primary btn-block mt-6" disabled={busy} onClick={save}>{busy ? <Loader2 size={18} className="animate-spin" /> : 'Guardar'}</button>
        </Sheet>
    );
};

const FlowRow = ({ label, value, sign, strong, onClick, hint }) => {
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag type={onClick ? 'button' : undefined} className="ios-row" onClick={onClick} style={{ minHeight: 48 }}>
            <span className="min-w-0 flex-1">
                <span className={`block ${strong ? 't-headline' : 't-body'}`}>{sign && <span className="mr-2 text-secondary">{sign}</span>}{label}</span>
                {hint && <span className="t-footnote block text-secondary">{hint}</span>}
            </span>
            <span className={`${strong ? 't-headline' : 't-body'} tabular`}>{formatCurrency(value)}</span>
            {onClick && <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />}
        </Tag>
    );
};

export const BudgetView = ({ onAdd, onAddToSection, onViewSyncedExpense, onViewAccounts, refreshKey }) => {
    const [monthKey, setMonthKey] = useState(() => getCurrentMonthKey());
    const [direction, setDirection] = useState('forward');
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [openId, setOpenId] = useState(null);
    const [showOpening, setShowOpening] = useState(false);

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

    return (
        <section className="animate-fade-up">
            <ScreenHeader
                title="Presupuesto"
                subtitle="Tu mes: lo planeado contra lo que de verdad pasó"
                actions={<NavAction label="Agregar movimiento" tint onClick={onAdd}><Plus size={20} strokeWidth={2.4} /></NavAction>}
            />

            <div className="ios-card flex items-center justify-between p-1.5">
                <button type="button" onClick={() => go(-1)} className="btn btn-icon" aria-label="Mes anterior"><ChevronLeft size={18} /></button>
                <span key={monthKey} className={`t-headline ${anim}`}>{monthKeyToLabel(monthKey)}</span>
                <button type="button" onClick={() => go(1)} className="btn btn-icon" aria-label="Mes siguiente"><ChevronRight size={18} /></button>
            </div>

            {error && <p className="t-subhead mt-4 rounded-[12px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}
            {!data && !error && <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-muted)' }} /></div>}

            {data && (
                <div key={monthKey} className={anim}>
                    <div className="ios-card mt-4 p-5">
                        <p className="t-footnote text-secondary">Disponible para gastar</p>
                        <p className="t-money-xl mt-1" style={{ color: data.totals.actual_net >= 0 ? 'var(--text-primary)' : 'var(--danger)' }}>{formatCurrency(data.totals.actual_net)}</p>
                        <p className="t-subhead mt-2 text-secondary">
                            Ingresos menos gastos de este mes. No cuenta ahorros ni lo que aún no te pagan.
                            {data.totals.weekly_actual > 0 && ` Son unos ${formatCurrency(data.totals.weekly_actual)} por semana.`}
                        </p>
                    </div>

                    {SECTIONS.map((section) => {
                        const bucket = data.sections[section.id];
                        const items = bucket.items;
                        return (
                            <div key={section.id}>
                                <div className="flex items-end justify-between px-4 pb-2 pt-6">
                                    <p className="t-section">{section.title}</p>
                                    <div className="flex items-baseline gap-3">
                                        <span className="t-footnote tabular text-secondary">{formatCurrency(bucket.actual_total)}</span>
                                        {section.addLabel && <button type="button" className="t-footnote font-semibold" style={{ color: 'var(--accent)' }} onClick={() => onAddToSection(section.id)}>Agregar</button>}
                                    </div>
                                </div>
                                {items.length === 0 ? (
                                    <div className="ios-card px-5 py-5"><p className="t-subhead text-secondary">{section.empty}</p></div>
                                ) : (
                                    <div className="ios-group">{items.map((i) => <ItemRow key={i.id} item={i} section={section} onOpen={(it) => setOpenId(it.id)} />)}</div>
                                )}
                            </div>
                        );
                    })}

                    <p className="t-section px-4 pb-2 pt-8">Flujo de caja del mes</p>
                    <div className="ios-group">
                        <FlowRow label="Saldo anterior" value={data.opening.cash_balance} onClick={() => setShowOpening(true)} hint="Con cuánto empezaste el mes" />
                        <FlowRow label="Ingresos" sign="+" value={data.sections.income.actual_total} />
                        <FlowRow label="Gastos fijos" sign="−" value={data.sections.fixed_expense.actual_total} />
                        <FlowRow label="Gastos del día a día" sign="−" value={data.sections.tracked_expense.actual_total} />
                        <FlowRow label="Ahorros" sign="+" value={data.sections.saving.actual_total} hint="Se suman de vuelta: el gasto vinculado ya los restó arriba" />
                        <FlowRow label="Pagos de deudas" sign="−" value={data.sections.debt.actual_total} />
                        <FlowRow label="Caja al cierre" value={data.totals.balance} strong />
                    </div>

                    <p className="t-section px-4 pb-2 pt-6">Acumulado</p>
                    <div className="ios-group">
                        <FlowRow label="Ahorros acumulados" value={data.totals.savings_balance} onClick={() => setShowOpening(true)} />
                        <FlowRow label="Deuda pendiente" value={data.totals.debt_balance} onClick={() => setShowOpening(true)} />
                    </div>
                    {items0(data) && <EmptyState title="Mes sin movimientos" message="Toca + para registrar tu primer ingreso o gasto de este mes." />}
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

const items0 = (data) => Object.values(data.sections).every((s) => s.items.length === 0);
