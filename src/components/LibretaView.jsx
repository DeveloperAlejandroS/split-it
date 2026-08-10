import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, NotebookText, Pencil, RefreshCw, Trash2, X } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { ConfirmDialog } from './ConfirmDialog';
import { CurrencyInput } from './CurrencyInput';
import { AnimatedNumber } from './AnimatedNumber';
import { formatCurrency } from '../utils/helpers';
import { API_URL } from '../config/api';

const TOKEN_KEY = 'splitit_jwt';

// Barra de progreso de cuánto de la deuda ya te pagaron. Mismo lenguaje
// visual que la barra de liquidación de gastos compartidos (verde =
// confirmado), para que se lea igual en toda la app.
const PaidProgressBar = ({ owed, paid }) => {
    const pct = owed > 0 ? Math.min(100, Math.round((paid / owed) * 100)) : 0;
    return (
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-(--success) transition-all" style={{ width: `${pct}%` }} />
        </div>
    );
};

const STATUS_META = {
    pending: { label: 'Pendiente', className: 'text-secondary' },
    partial: { label: 'Parcial', className: 'text-(--warning)' },
    paid: { label: 'Pagada', className: 'text-(--success)' },
};

const LibretaEntryCard = ({ entry, theme, onContribute, onDelete, onUpdate }) => {
    const [showAbonoForm, setShowAbonoForm] = useState(false);
    const [amount, setAmount] = useState(String(entry.remaining));
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(entry.debtor_name);
    const [editDescription, setEditDescription] = useState(entry.description || '');
    const [editAmountOwed, setEditAmountOwed] = useState(String(entry.amount_owed));
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [editError, setEditError] = useState('');

    const meta = STATUS_META[entry.status] || STATUS_META.pending;

    const handleOpenAbono = () => {
        setAmount(String(entry.remaining));
        setError('');
        setShowAbonoForm(true);
    };

    const handleSubmitAbono = async () => {
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0 || value > entry.remaining + 0.01) {
            setError('Monto inválido');
            return;
        }
        setIsSaving(true);
        setError('');
        const ok = await onContribute(entry.id, value);
        setIsSaving(false);
        if (ok) setShowAbonoForm(false);
        else setError('No se pudo registrar el abono');
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        await onDelete(entry.id);
        setIsDeleting(false);
        setShowDeleteConfirm(false);
    };

    const handleOpenEdit = () => {
        setEditName(entry.debtor_name);
        setEditDescription(entry.description || '');
        setEditAmountOwed(String(entry.amount_owed));
        setEditError('');
        setIsEditing(true);
    };

    const handleSaveEdit = async () => {
        if (!editName.trim()) {
            setEditError('Ponle un nombre');
            return;
        }
        const value = Number(editAmountOwed);
        if (!Number.isFinite(value) || value <= 0) {
            setEditError('Monto inválido');
            return;
        }
        if (value < entry.amount_paid) {
            setEditError(`No puedes bajar la deuda por debajo de lo ya pagado (${formatCurrency(entry.amount_paid)})`);
            return;
        }
        setIsSavingEdit(true);
        setEditError('');
        const ok = await onUpdate(entry.id, {
            debtor_name: editName.trim(),
            description: editDescription.trim() || null,
            amount_owed: value,
        });
        setIsSavingEdit(false);
        if (ok) setIsEditing(false);
        else setEditError('No se pudo guardar');
    };

    if (isEditing) {
        return (
            <GlassCard theme={theme} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Editar deuda</p>
                    <button type="button" onClick={() => setIsEditing(false)} className="text-muted hover:text-primary p-1" aria-label="Cancelar edición">
                        <X size={14} />
                    </button>
                </div>
                {editError && <p className="text-[10px] text-(--danger)">{editError}</p>}
                <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nombre"
                    className="w-full bg-white/5 rounded-lg px-2.5 py-1.5 text-sm text-primary outline-none border border-transparent focus:border-(--accent)/50"
                />
                <input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Motivo (opcional)"
                    className="w-full bg-white/5 rounded-lg px-2.5 py-1.5 text-sm text-primary outline-none border border-transparent focus:border-(--accent)/50"
                />
                <CurrencyInput
                    value={editAmountOwed}
                    onChange={setEditAmountOwed}
                    className="w-full bg-white/5 rounded-lg px-2.5 py-1.5 text-sm text-primary outline-none border border-transparent focus:border-(--accent)/50 tabular"
                />
                <button
                    type="button"
                    disabled={isSavingEdit}
                    onClick={handleSaveEdit}
                    className="w-full py-2.5 rounded-xl font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))', color: 'var(--accent-contrast)' }}
                >
                    {isSavingEdit ? <Loader2 size={14} className="animate-spin" /> : null}
                    Guardar
                </button>
            </GlassCard>
        );
    }

    return (
        <GlassCard theme={theme} className="p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-bold text-primary truncate">{entry.debtor_name}</p>
                    {entry.description && (
                        <p className="text-xs text-muted mt-0.5 line-clamp-2">{entry.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={handleOpenEdit}
                        className="text-muted hover:text-primary transition-colors p-1"
                        aria-label={`Editar deuda de ${entry.debtor_name}`}
                    >
                        <Pencil size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-muted hover:text-(--danger) transition-colors p-1"
                        aria-label={`Eliminar deuda de ${entry.debtor_name}`}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between text-xs">
                <span className="text-muted">
                    Debe {formatCurrency(entry.amount_owed)}
                    {entry.amount_paid > 0 && <span> · pagó {formatCurrency(entry.amount_paid)}</span>}
                </span>
                <span className={`font-bold uppercase tracking-wide text-[10px] ${meta.className}`}>{meta.label}</span>
            </div>

            {entry.status !== 'paid' && <PaidProgressBar owed={entry.amount_owed} paid={entry.amount_paid} />}

            <div className="flex items-center justify-between pt-1">
                <span className="text-lg font-black tabular text-primary">
                    {entry.status === 'paid' ? (
                        <span className="text-(--success) flex items-center gap-1.5 text-sm font-bold">
                            <CheckCircle2 size={16} /> Saldada
                        </span>
                    ) : (
                        <>Faltan <AnimatedNumber value={entry.remaining} /></>
                    )}
                </span>
                {entry.status !== 'paid' && !showAbonoForm && (
                    <button
                        type="button"
                        onClick={handleOpenAbono}
                        className="px-3 py-1.5 rounded-xl bg-(--success) text-white text-xs font-bold hover:brightness-95 active:scale-95 transition-all"
                    >
                        Registrar abono
                    </button>
                )}
            </div>

            {showAbonoForm && (
                <div className="flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                    <CurrencyInput
                        value={amount}
                        onChange={setAmount}
                        autoFocus
                        className="flex-1 min-w-0 bg-white/5 rounded-lg px-2 py-1.5 text-sm text-primary outline-none border border-(--accent)/40 tabular"
                    />
                    <button
                        type="button"
                        disabled={isSaving}
                        onClick={handleSubmitAbono}
                        className="px-3 py-1.5 rounded-lg bg-(--success) text-white text-xs font-bold disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Listo'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowAbonoForm(false)}
                        className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-secondary text-xs"
                    >
                        Cancelar
                    </button>
                </div>
            )}
            {error && <p className="text-[10px] text-(--danger)">{error}</p>}

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                tone="danger"
                title={`¿Eliminar la deuda de "${entry.debtor_name}"?`}
                message="Esta acción no se puede deshacer. Los abonos que ya registraste siguen contando en tu presupuesto — esto solo borra el registro de la Libreta."
                confirmLabel="Eliminar"
                isLoading={isDeleting}
                theme={theme}
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </GlassCard>
    );
};

export const LibretaView = ({ theme = 'dark' }) => {
    const [entries, setEntries] = useState([]);
    const [totalPending, setTotalPending] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchEntries = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const token = localStorage.getItem(TOKEN_KEY);
            const res = await fetch(`${API_URL}/libreta`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
            setEntries(json.entries || []);
            setTotalPending(json.total_pending || 0);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const handleContribute = async (entryId, amount) => {
        try {
            const token = localStorage.getItem(TOKEN_KEY);
            const res = await fetch(`${API_URL}/libreta/${entryId}/contribute`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Accept: 'application/json' },
                body: JSON.stringify({ amount }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
            await fetchEntries();
            return true;
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 5000);
            return false;
        }
    };

    const handleUpdate = async (entryId, patch) => {
        try {
            const token = localStorage.getItem(TOKEN_KEY);
            const res = await fetch(`${API_URL}/libreta/${entryId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Accept: 'application/json' },
                body: JSON.stringify(patch),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
            await fetchEntries();
            return true;
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 5000);
            return false;
        }
    };

    const handleDelete = async (entryId) => {
        try {
            const token = localStorage.getItem(TOKEN_KEY);
            const res = await fetch(`${API_URL}/libreta/${entryId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
            await fetchEntries();
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 5000);
        }
    };

    const pendingEntries = entries.filter((e) => e.status !== 'paid');
    const paidEntries = entries.filter((e) => e.status === 'paid');

    return (
        <section className="space-y-5">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <div
                        className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                    >
                        <NotebookText size={16} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-primary leading-tight">Libreta</h3>
                        <p className="text-xs text-muted">
                            Deudas de gente que no usa Split.it y te debe a ti — registras el abono cuando de verdad te paguen.
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchEntries}
                    disabled={isLoading}
                    className="p-2 rounded-full transition-all disabled:opacity-50"
                    style={{ background: 'var(--surface-soft)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}
                    aria-label="Refrescar"
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>

            {error && (
                <div
                    className="p-3 rounded-2xl text-sm text-primary animate-row-in"
                    style={{ background: 'var(--danger-soft)', border: '1px solid rgba(232,99,122,0.25)' }}
                >
                    {error}
                </div>
            )}

            <GlassCard theme={theme} className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted mb-1">Total pendiente</p>
                <p className="text-[11px] text-muted mb-2 leading-snug">
                    La suma de lo que todavía te deben. No tiene relación con tu Balance de Ingresos — solo cuenta cuando registras un abono.
                </p>
                <p className="text-2xl font-black tabular text-primary">
                    <AnimatedNumber value={totalPending} />
                </p>
            </GlassCard>

            {!isLoading && entries.length === 0 && (
                <GlassCard theme={theme} className="p-8 text-center">
                    <p className="text-sm text-muted">Todavía no registraste ninguna deuda en tu Libreta.</p>
                </GlassCard>
            )}

            {pendingEntries.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {pendingEntries.map((entry) => (
                        <LibretaEntryCard key={entry.id} entry={entry} theme={theme} onContribute={handleContribute} onDelete={handleDelete} onUpdate={handleUpdate} />
                    ))}
                </div>
            )}

            {paidEntries.length > 0 && (
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted mb-2 px-1">Saldadas</p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 opacity-70">
                        {paidEntries.map((entry) => (
                            <LibretaEntryCard key={entry.id} entry={entry} theme={theme} onContribute={handleContribute} onDelete={handleDelete} onUpdate={handleUpdate} />
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
};
