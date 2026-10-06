import { useEffect, useState } from 'react';
import { useHeldValue } from './ui/useHeldValue';
import { Check, CircleNotch } from '@phosphor-icons/react';
import { Sheet } from './ui/Sheet';
import { Avatar } from './ui/Avatar';
import { ProgressBar } from './ui/ProgressBar';
import { ConfirmDialog } from './ConfirmDialog';
import { CurrencyInput } from './CurrencyInput';
import { API_URL } from '../config/api';
import { formatCurrency } from '../utils/helpers';
import { getCurrentMonthKey, monthKeyToLabel } from '../utils/budgetHelpers';
import { LEDGER } from './ledgerConfig';

const TOKEN_KEY = 'splitit_jwt';

const headers = (json) => ({
    Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
});

const callApi = async (path, method, body) => {
    const res = await fetch(`${API_URL}${path}`, { method, headers: headers(Boolean(body)), ...(body ? { body: JSON.stringify(body) } : {}) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
    return json;
};

const pad = (n) => String(n).padStart(2, '0');
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const shortMonth = (key) => { const [y, m] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('es-CO', { month: 'short', year: 'numeric', timeZone: 'UTC' }); };
const dateLabel = (key) => new Date(`${key}T00:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

export const AddLedgerEntrySheet = ({ isOpen, kind, onClose, onCreated }) => {
    const cfg = LEDGER[kind];
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    // Solo "Yo debo": fecha de la deuda y, si se quiere, dividirla en cuotas mensuales.
    const [date, setDate] = useState(todayKey());
    const [inInstallments, setInInstallments] = useState(false);
    const [count, setCount] = useState('12');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen) return;
        setName(''); setDescription(''); setAmount(''); setError('');
        setDate(todayKey()); setInInstallments(false); setCount('12');
    }, [isOpen]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const value = Number(amount);
    const supportsPlan = kind === 'owe';
    const countValue = Number(count);
    const countValid = Number.isInteger(countValue) && countValue >= 2 && countValue <= 120;
    const planOn = supportsPlan && inInstallments;
    const missing = !name.trim() ? 'Escribe el nombre'
        : !(value > 0) ? 'Escribe el monto'
        : supportsPlan && !date ? 'Elige la fecha de la deuda'
        : planOn && !countValid ? 'Indica cuántas cuotas (de 2 a 120)'
        : '';
    const perCuota = planOn && countValid && value > 0 ? Math.floor(value / countValue) : 0;
    const hasRemainder = planOn && countValid && value > 0 && value % countValue !== 0;

    const save = async () => {
        if (missing) return;
        setSaving(true);
        setError('');
        try {
            await callApi(cfg.base, 'POST', { [cfg.nameKey]: name.trim(), description: description.trim() || null, amount_owed: value, ...(supportsPlan ? { start_date: date, ...(planOn ? { installments: countValue } : {}) } : {}) });
            onCreated?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet isOpen={isOpen} onClose={onClose} title={cfg.addTitle}>
            <div className="py-4 text-center">
                <label htmlFor="ledger-amount" className="small text-secondary">Monto</label>
                <CurrencyInput id="ledger-amount" value={amount} onChange={setAmount} autoFocus placeholder="$0" echo className="input-amount" />
            </div>
            <div className="space-y-3">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={cfg.nameLabel} aria-label={cfg.nameLabel} autoCapitalize="words" className="field" />
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Motivo (opcional)" aria-label="Motivo" className="field" />
            </div>
            {supportsPlan && (
                <div className="mt-3 space-y-3">
                    <div>
                        <label className="field-label" htmlFor="ledger-date">Fecha de la deuda</label>
                        <input id="ledger-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />
                    </div>
                    <div className="segmented" role="group" aria-label="Forma de pago">
                        <button type="button" aria-pressed={!inInstallments} onClick={() => setInInstallments(false)}>Sin cuotas</button>
                        <button type="button" aria-pressed={inInstallments} onClick={() => setInInstallments(true)}>En cuotas</button>
                    </div>
                    {planOn && (
                        <div>
                            <label className="field-label" htmlFor="ledger-count">Número de cuotas (una por mes)</label>
                            <input id="ledger-count" type="number" inputMode="numeric" min="2" max="120" value={count} onChange={(e) => setCount(e.target.value)} className="field" />
                            {perCuota > 0 && (
                                <p className="small mt-2 px-1" style={{ color: 'var(--ink)' }}>
                                    {countValue} cuotas de {formatCurrency(perCuota)}, la primera en {monthKeyToLabel(date.slice(0, 7)).toLowerCase()}.{hasRemainder ? ' La última ajusta la diferencia.' : ''}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
            <p className="small mt-4 px-1 text-secondary">{planOn ? cfg.installmentsEffect : cfg.createEffect}</p>
            {error && <p role="alert" className="small mt-3 rounded-[12px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}
            <div className="mt-5">
                <button type="button" className="btn btn-primary btn-block" disabled={Boolean(missing) || saving} onClick={save}>
                    {saving ? <CircleNotch size={20} className="animate-spin" /> : 'Guardar'}
                </button>
                {missing && <p className="small mt-2 text-center text-secondary">{missing}</p>}
            </div>
        </Sheet>
    );
};

export const LedgerEntrySheet = ({ entry, kind, onClose, onChanged }) => {
    const cfg = LEDGER[kind];
    const shown = useHeldValue(entry);

    const [amount, setAmount] = useState('');
    // Registrar un abono mueve plata en el presupuesto y no se puede deshacer: pide una confirmación con el monto.
    const [confirming, setConfirming] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editTotal, setEditTotal] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [showDelete, setShowDelete] = useState(false);

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!entry) return;
        // Vacío a propósito: antes venía con el saldo completo y un toque lo registraba entero.
        setAmount('');
        setConfirming(false);
        setEditing(false);
        setError('');
        setEditName(entry[cfg.nameKey] || '');
        setEditDescription(entry.description || '');
        setEditTotal(String(entry.amount_owed));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entry?.id, entry?.remaining, cfg.nameKey]);
    /* eslint-enable react-hooks/set-state-in-effect */

    if (!shown) return null;

    const name = shown[cfg.nameKey];
    const paidPct = shown.amount_owed > 0 ? Math.min(100, (shown.amount_paid / shown.amount_owed) * 100) : 0;
    const isPaid = shown.status === 'paid';
    const abonoValue = Number(amount);
    const abonoValid = abonoValue > 0 && abonoValue <= shown.remaining + 0.01;
    const plan = kind === 'owe' && shown.installments?.length > 0 ? shown.installments : null;
    const paidCount = plan ? plan.filter((i) => i.paid).length : 0;
    const currentMonth = getCurrentMonthKey();

    const act = async (fn) => {
        setBusy(true);
        setError('');
        try { await fn(); await onChanged(); } catch (err) { setError(err instanceof TypeError ? 'No hay conexión con el servidor. Revisa tu internet.' : err.message); } finally { setBusy(false); setConfirming(false); }
    };

    return (
        <>
            <Sheet isOpen={Boolean(entry)} onClose={onClose} title={kind === 'owed' ? 'Me debe' : 'Debo'} closeLabel="Cerrar">
                <div className="flex flex-col items-center pb-4 pt-2 text-center">
                    <Avatar name={name} size={64} />
                    <h3 className="title mt-3">{name}</h3>
                    {shown.description && <p className="small text-secondary">{shown.description}</p>}
                    {shown.start_date && kind === 'owe' && <p className="small text-secondary">Desde el {dateLabel(shown.start_date)}{plan ? ` · ${plan.length} cuotas` : ''}</p>}
                </div>

                <div className="ios-card p-4">
                    <div className="grid grid-cols-3 text-center">
                        <div><p className="tiny text-secondary">Total</p><p className="heading tabular">{formatCurrency(shown.amount_owed)}</p></div>
                        <div><p className="tiny text-secondary">{kind === 'owed' ? 'Pagado' : 'Abonado'}</p><p className="heading tabular">{formatCurrency(shown.amount_paid)}</p></div>
                        <div><p className="tiny text-secondary">Falta</p><p className="heading tabular">{formatCurrency(shown.remaining)}</p></div>
                    </div>
                    <div className="mt-3">
                        <ProgressBar pct={paidPct} tone="primary" height={6} label={`${Math.round(paidPct)} % ${kind === 'owed' ? 'pagado' : 'abonado'}`} />
                    </div>
                </div>

                {plan && !editing && (
                    <>
                        <div className="flex items-baseline justify-between px-1 pb-2 pt-6">
                            <p className="heading">Cuotas</p>
                            <p className="small">{paidCount} de {plan.length} pagadas</p>
                        </div>
                        <ul className="stack">
                            {plan.map((inst) => {
                                const late = !inst.paid && inst.due_month < currentMonth;
                                return (
                                    <li key={inst.id} className="row" style={{ cursor: 'default' }}>
                                        <span className="min-w-0 flex-1">
                                            <span className="body block font-semibold">Cuota {inst.number} de {plan.length}</span>
                                            <span className="small block" style={late ? { color: 'var(--neg)' } : undefined}>{late ? 'Vencida · ' : ''}{shortMonth(inst.due_month)} · {formatCurrency(inst.amount)}</span>
                                        </span>
                                        <button
                                            type="button"
                                            className={`btn btn-sm btn-44 shrink-0 ${inst.paid ? 'btn-tinted' : 'btn-gray'}`}
                                            aria-pressed={inst.paid}
                                            aria-label={inst.paid ? `Cuota ${inst.number} pagada. Deshacer` : `Marcar la cuota ${inst.number} como pagada`}
                                            disabled={busy}
                                            onClick={() => act(() => callApi(`${cfg.base}/${shown.id}/installments/${inst.number}`, 'PATCH', { paid: !inst.paid }))}
                                        >
                                            {inst.paid ? <><Check size={16} weight="bold" /> Pagada</> : 'Marcar pagada'}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                        <p className="small mt-2 px-1 text-secondary">{cfg.installmentsEffect}</p>
                    </>
                )}

                {!isPaid && !editing && !plan && (
                    <>
                        <p className="heading px-1 pb-2 pt-6">{cfg.abonoTitle}</p>
                        {confirming ? (
                            <div className="rounded-[18px] p-4" style={{ background: 'var(--card-soft)' }} role="group" aria-label="Confirmar abono">
                                <p className="body font-semibold">Vas a registrar {formatCurrency(abonoValue)}.</p>
                                <p className="small mt-1" style={{ color: 'var(--ink)' }}>{cfg.confirmEffect(formatCurrency(abonoValue))}</p>
                                <div className="mt-3 grid grid-cols-2 gap-3">
                                    <button type="button" className="btn btn-gray" disabled={busy} onClick={() => setConfirming(false)}>Cambiar</button>
                                    <button type="button" className="btn btn-primary" disabled={busy} onClick={() => act(() => callApi(`${cfg.base}/${shown.id}/contribute`, 'PATCH', { amount: abonoValue }))}>
                                        {busy ? <CircleNotch size={18} className="animate-spin" /> : <><Check size={18} weight="bold" /> Confirmar</>}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2">
                                    <CurrencyInput value={amount} onChange={setAmount} className="field" placeholder={formatCurrency(shown.remaining)} aria-label={`Monto del ${kind === 'owed' ? 'abono' : 'pago'}`} />
                                    <button type="button" className="btn btn-primary shrink-0" disabled={!abonoValid || busy} onClick={() => setConfirming(true)}>Registrar</button>
                                </div>
                                <button type="button" className="btn btn-plain btn-sm btn-44 mt-1" onClick={() => setAmount(String(shown.remaining))}>Pagar todo ({formatCurrency(shown.remaining)})</button>
                                <p className="small mt-1 px-1 text-secondary">{cfg.effect}</p>
                            </>
                        )}
                    </>
                )}

                {isPaid && <p className="small mt-4 flex items-center justify-center gap-2 rounded-[12px] p-3 text-center" style={{ background: 'var(--card-soft)', color: 'var(--ink)' }}><Check size={16} weight="bold" aria-hidden="true" /> Saldada por completo</p>}

                {editing && (
                    <div className="mt-6 space-y-3">
                        <input className="field" value={editName} onChange={(e) => setEditName(e.target.value)} aria-label="Nombre" />
                        <input className="field" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Motivo (opcional)" aria-label="Motivo" />
                        {plan ? (
                            <p className="small px-1 text-secondary">El total ({formatCurrency(shown.amount_owed)}) no se cambia en una deuda a cuotas. Si te equivocaste, elimínala y créala de nuevo.</p>
                        ) : (
                            <>
                                <CurrencyInput className="field" value={editTotal} onChange={setEditTotal} />
                                <p className="small px-1 text-secondary">No puedes bajar el total por debajo de lo ya {kind === 'owed' ? 'pagado' : 'abonado'} ({formatCurrency(shown.amount_paid)}).</p>
                            </>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <button type="button" className="btn btn-gray" onClick={() => setEditing(false)}>Cancelar</button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={busy || !editName.trim() || !(Number(editTotal) >= shown.amount_paid && Number(editTotal) > 0)}
                                onClick={() => act(async () => {
                                    await callApi(`${cfg.base}/${shown.id}`, 'PATCH', { [cfg.nameKey]: editName.trim(), description: editDescription.trim() || null, amount_owed: Number(editTotal) });
                                    setEditing(false);
                                })}
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                )}

                {error && <p role="alert" className="small mt-4 rounded-[12px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}

                {!editing && (
                    <div className="mt-6 flex flex-col gap-2">
                        <button type="button" className="btn btn-gray btn-block" onClick={() => setEditing(true)}>Editar</button>
                        <button type="button" className="btn btn-plain btn-block" style={{ color: 'var(--danger)' }} onClick={() => setShowDelete(true)}>Eliminar</button>
                    </div>
                )}
            </Sheet>

            <ConfirmDialog
                isOpen={showDelete}
                tone="danger"
                title={`¿Eliminar a ${name}?`}
                message={plan ? 'Las cuotas pendientes se quitan de tu presupuesto. Las que ya pagaste siguen contando.' : 'Los abonos ya registrados siguen contando en tu presupuesto. Solo se borra este registro.'}
                confirmLabel="Eliminar"
                isLoading={busy}
                onConfirm={() => act(async () => { await callApi(`${cfg.base}/${shown.id}`, 'DELETE'); setShowDelete(false); onClose(); })}
                onCancel={() => setShowDelete(false)}
            />
        </>
    );
};
