import { useEffect, useState } from 'react';
import { useHeldValue } from './ui/useHeldValue';
import { CircleNotch } from '@phosphor-icons/react';
import { Sheet } from './ui/Sheet';
import { Avatar } from './ui/Avatar';
import { ConfirmDialog } from './ConfirmDialog';
import { CurrencyInput } from './CurrencyInput';
import { API_URL } from '../config/api';
import { formatCurrency } from '../utils/helpers';
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

export const AddLedgerEntrySheet = ({ isOpen, kind, onClose, onCreated }) => {
    const cfg = LEDGER[kind];
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen) return;
        setName(''); setDescription(''); setAmount(''); setError('');
    }, [isOpen]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const value = Number(amount);
    const missing = !name.trim() ? 'Escribe el nombre' : !(value > 0) ? 'Escribe el monto' : '';

    const save = async () => {
        if (missing) return;
        setSaving(true);
        setError('');
        try {
            await callApi(cfg.base, 'POST', { [cfg.nameKey]: name.trim(), description: description.trim() || null, amount_owed: value });
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
            <p className="small mt-3 px-1 text-secondary">{cfg.createEffect}</p>
            {error && <p className="small mt-3 rounded-[12px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}
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
        setAmount(String(entry.remaining));
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

    const act = async (fn) => {
        setBusy(true);
        setError('');
        try { await fn(); await onChanged(); } catch (err) { setError(err.message); } finally { setBusy(false); }
    };

    return (
        <>
            <Sheet isOpen={Boolean(entry)} onClose={onClose} title={kind === 'owed' ? 'Me debe' : 'Debo'} closeLabel="Cerrar">
                <div className="flex flex-col items-center pb-4 pt-2 text-center">
                    <Avatar name={name} size={64} />
                    <h3 className="title mt-3">{name}</h3>
                    {shown.description && <p className="small text-secondary">{shown.description}</p>}
                </div>

                <div className="ios-card p-4">
                    <div className="grid grid-cols-3 text-center">
                        <div><p className="tiny text-secondary">Total</p><p className="heading tabular">{formatCurrency(shown.amount_owed)}</p></div>
                        <div><p className="tiny text-secondary">{kind === 'owed' ? 'Pagado' : 'Abonado'}</p><p className="heading tabular" style={{ color: 'var(--success)' }}>{formatCurrency(shown.amount_paid)}</p></div>
                        <div><p className="tiny text-secondary">Falta</p><p className="heading tabular">{formatCurrency(shown.remaining)}</p></div>
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--fill)' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${paidPct}%`, background: 'var(--success)' }} />
                    </div>
                </div>

                {!isPaid && !editing && (
                    <>
                        <p className="heading px-1 pb-2 pt-6">{cfg.abonoTitle}</p>
                        <div className="flex items-center gap-2">
                            <CurrencyInput value={amount} onChange={setAmount} className="field" />
                            <button type="button" className="btn btn-primary shrink-0" disabled={!abonoValid || busy} onClick={() => act(() => callApi(`${cfg.base}/${shown.id}/contribute`, 'PATCH', { amount: abonoValue }))}>
                                {busy ? <CircleNotch size={18} className="animate-spin" /> : 'Registrar'}
                            </button>
                        </div>
                        <p className="small mt-2 px-1 text-secondary">{cfg.effect}</p>
                    </>
                )}

                {isPaid && <p className="small mt-4 rounded-[12px] p-3 text-center" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>Saldada por completo ✓</p>}

                {editing && (
                    <div className="mt-6 space-y-3">
                        <input className="field" value={editName} onChange={(e) => setEditName(e.target.value)} aria-label="Nombre" />
                        <input className="field" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Motivo (opcional)" aria-label="Motivo" />
                        <CurrencyInput className="field" value={editTotal} onChange={setEditTotal} />
                        <p className="small px-1 text-secondary">No puedes bajar el total por debajo de lo ya {kind === 'owed' ? 'pagado' : 'abonado'} ({formatCurrency(shown.amount_paid)}).</p>
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

                {error && <p className="small mt-4 rounded-[12px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}

                {!editing && (
                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <button type="button" className="btn btn-gray" onClick={() => setEditing(true)}>Editar</button>
                        <button type="button" className="btn btn-danger" onClick={() => setShowDelete(true)}>Eliminar</button>
                    </div>
                )}
            </Sheet>

            <ConfirmDialog
                isOpen={showDelete}
                tone="danger"
                title={`¿Eliminar a ${name}?`}
                message="Los abonos ya registrados siguen contando en tu presupuesto. Solo se borra este registro."
                confirmLabel="Eliminar"
                isLoading={busy}
                onConfirm={() => act(async () => { await callApi(`${cfg.base}/${shown.id}`, 'DELETE'); setShowDelete(false); onClose(); })}
                onCancel={() => setShowDelete(false)}
            />
        </>
    );
};
