import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Loader2, Pencil, Trash2, X, XCircle } from 'lucide-react';
import { formatCurrency, getParticipantStatus, numberOrZero, PARTICIPANT_STATUS_META } from '../utils/helpers';
import { ConfirmDialog } from './ConfirmDialog';
import { CurrencyInput } from './CurrencyInput';

// Barra de progreso por participante: verde = ya confirmado (amount_paid),
// ámbar rayado = reclamado pero esperando confirmación del pagador
// (pending_claim_amount), el resto sin cubrir queda transparente.
const PaymentProgressBar = ({ owed, paid, pendingClaim }) => {
    const total = numberOrZero(owed) || 1;
    const paidPct = Math.min(100, (numberOrZero(paid) / total) * 100);
    const pendingPct = Math.min(100 - paidPct, (numberOrZero(pendingClaim) / total) * 100);

    return (
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden flex">
            <div className="h-full bg-(--success) transition-all" style={{ width: `${paidPct}%` }} />
            <div
                className="h-full bg-(--info) opacity-70 transition-all"
                style={{
                    width: `${pendingPct}%`,
                    backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0 4px, transparent 4px 8px)',
                }}
            />
        </div>
    );
};

// Formulario inline de abono parcial (compartido entre "Marcar pagado" del
// pagador y "Ya pagué" del deudor) — por defecto sugiere el saldo restante,
// pero permite tipear cualquier monto menor.
const PartialPayForm = ({ remaining, onConfirm, onCancel, isPending }) => {
    const [amount, setAmount] = useState(String(remaining));

    const handleSubmit = () => {
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0 || value > remaining + 0.01) return;
        onConfirm(value);
    };

    return (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <CurrencyInput
                value={amount}
                onChange={setAmount}
                autoFocus
                className="w-24 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-primary text-right outline-none focus:border-(--accent)"
            />
            <button
                disabled={isPending}
                onClick={handleSubmit}
                className="w-7 h-7 rounded-lg bg-(--success) text-white flex items-center justify-center disabled:opacity-50"
                aria-label="Confirmar abono"
            >
                {isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            </button>
            <button
                onClick={onCancel}
                className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-secondary flex items-center justify-center"
                aria-label="Cancelar abono"
            >
                <X size={12} />
            </button>
        </div>
    );
};

export const ExpenseDetailModal = ({
    expense,
    currentUserId,
    onClose,
    onClaim,
    onMarkPaid,
    onConfirmPayment,
    onRejectPayment,
    onEdit,
    onDelete,
    isLoading,
    theme = 'dark',
}) => {
    const [pendingActionKey, setPendingActionKey] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [partialFormKey, setPartialFormKey] = useState(null);

    // FIX: Close on Escape key
    useEffect(() => {
        if (!expense) return;
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [expense, onClose]);

    if (!expense) return null;

    const isOwner = expense.paid_by_me;
    const ownerId = typeof expense.paid_by === 'object' ? expense.paid_by.id : expense.paid_by;
    const participants = Array.isArray(expense.participants) ? expense.participants : [];

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    const runAction = async (key, action) => {
        setPendingActionKey(key);
        try {
            await action();
        } finally {
            setPendingActionKey(null);
        }
    };

    const handleDeleteConfirm = async () => {
        await onDelete?.(expense);
        setShowDeleteConfirm(false);
    };

    return (
        <div
            className="fixed inset-0 z-90 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 sm:p-6"
            onClick={handleBackdropClick}
            role="presentation"
        >
            <div className="absolute inset-0 bg-slate-900/20 pointer-events-none" />

            <div
                className="relative z-91 w-full max-w-2xl glass-shell-strong rounded-4xl shadow-2xl max-h-[88vh] overflow-hidden border border-white/10 animate-in fade-in zoom-in-95 duration-200"
            >
                {/* Sticky header */}
                <div
                    className="p-6 sm:p-7 border-b border-white/10 flex items-start justify-between gap-4 sticky top-0 backdrop-blur-xl"
                    style={{ background: 'color-mix(in srgb, var(--app-bg) 82%, transparent)' }}
                >
                    <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.28em] text-secondary">Detalle del gasto</p>
                        <h4 className="text-2xl font-bold text-primary mt-2 leading-tight truncate">{expense.description}</h4>
                        <p className="text-sm text-secondary mt-2">Total: {formatCurrency(expense.amount)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {isOwner && (
                            <>
                                <button
                                    onClick={() => onEdit?.(expense)}
                                    className="w-10 h-10 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                                    aria-label="Editar gasto"
                                >
                                    <Pencil size={16} className="text-secondary" />
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="w-10 h-10 rounded-2xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition-colors"
                                    aria-label="Eliminar gasto"
                                >
                                    <Trash2 size={16} className="text-rose-400" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                            aria-label="Cerrar detalle"
                        >
                            <X size={18} className="text-secondary" />
                        </button>
                    </div>
                </div>

                {/* Participant list */}
                <div className="p-6 sm:p-7 space-y-3 overflow-y-auto max-h-[calc(88vh-100px)]">
                    {participants.map((participant) => {
                        const status = getParticipantStatus(participant);
                        const meta = PARTICIPANT_STATUS_META[status];
                        const isThisParticipantMe = numberOrZero(participant.user_id) === currentUserId;
                        const isParticipantOwner = numberOrZero(participant.user_id) === numberOrZero(ownerId);
                        const actionKey = `${participant.user_id}`;
                        const isPending = pendingActionKey === actionKey || isLoading;
                        const owed = numberOrZero(participant.amount_owed);
                        const paid = numberOrZero(participant.amount_paid);
                        const pendingClaim = numberOrZero(participant.pending_claim_amount);
                        const remaining = Math.max(0, owed - paid - pendingClaim);
                        const showPartialForm = partialFormKey === actionKey;
                        const canPartial = !isParticipantOwner && status === 'pending' && remaining > 0 && (isOwner || isThisParticipantMe);

                        const closePartial = () => setPartialFormKey(null);
                        const submitPartial = (action) => (amount) => {
                            setPartialFormKey(null);
                            runAction(actionKey, () => action(amount));
                        };

                        return (
                            <div
                                key={participant.user_id}
                                className="p-4 rounded-2xl border border-white/10 bg-black/20 flex flex-col gap-2.5"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-semibold text-primary truncate">
                                                {isThisParticipantMe ? 'Yo' : participant.email || 'Usuario'}
                                            </span>
                                            {isParticipantOwner && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-(--neutral-chip) text-secondary font-bold uppercase tracking-widest">
                                                    Pagador
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-secondary">
                                            Debe: {formatCurrency(owed)}
                                            {(paid > 0 || pendingClaim > 0) && !isParticipantOwner && (
                                                <span className="text-muted"> · Abonado {formatCurrency(paid)}</span>
                                            )}
                                        </p>
                                    </div>

                                    <div className="shrink-0 flex items-center gap-2">
                                        {isParticipantOwner ? (
                                            <span className="text-xs font-bold text-muted">Owner</span>
                                        ) : status === 'paid' ? (
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${meta.badgeClass}`}>
                                                <CheckCircle2 size={14} />
                                                {meta.label}
                                            </span>
                                        ) : status === 'awaiting_confirmation' ? (
                                            isOwner ? (
                                                <>
                                                    <button
                                                        disabled={isPending}
                                                        onClick={() => runAction(actionKey, () => onConfirmPayment(expense.id, participant.user_id))}
                                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-(--success) text-white text-xs font-bold hover:brightness-95 active:scale-95 disabled:opacity-50 transition-all"
                                                    >
                                                        {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                        Confirmar {formatCurrency(pendingClaim)}
                                                    </button>
                                                    <button
                                                        disabled={isPending}
                                                        onClick={() => runAction(actionKey, () => onRejectPayment(expense.id, participant.user_id))}
                                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-secondary text-xs font-bold hover:text-primary hover:bg-white/10 active:scale-95 disabled:opacity-50 transition-all"
                                                    >
                                                        <XCircle size={14} />
                                                        Rechazar
                                                    </button>
                                                </>
                                            ) : (
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${meta.badgeClass}`}>
                                                    <Clock size={14} />
                                                    {meta.label} ({formatCurrency(pendingClaim)})
                                                </span>
                                            )
                                        ) : showPartialForm ? (
                                            <PartialPayForm
                                                remaining={remaining}
                                                isPending={isPending}
                                                onCancel={closePartial}
                                                onConfirm={submitPartial((amount) =>
                                                    isOwner
                                                        ? onMarkPaid(expense.id, participant.user_id, amount)
                                                        : onClaim(expense.id, amount)
                                                )}
                                            />
                                        ) : isOwner ? (
                                            <>
                                                {canPartial && (
                                                    <button
                                                        onClick={() => setPartialFormKey(actionKey)}
                                                        className="text-[11px] font-bold text-secondary hover:text-primary underline underline-offset-2 px-1"
                                                    >
                                                        Abonar
                                                    </button>
                                                )}
                                                <button
                                                    disabled={isPending}
                                                    onClick={() => runAction(actionKey, () => onMarkPaid(expense.id, participant.user_id))}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-(--success) text-white text-xs font-bold hover:brightness-95 active:scale-95 disabled:opacity-50 transition-all"
                                                >
                                                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                    Marcar pagado
                                                </button>
                                            </>
                                        ) : isThisParticipantMe ? (
                                            <>
                                                {canPartial && (
                                                    <button
                                                        onClick={() => setPartialFormKey(actionKey)}
                                                        className="text-[11px] font-bold text-secondary hover:text-primary underline underline-offset-2 px-1"
                                                    >
                                                        Abonar
                                                    </button>
                                                )}
                                                <button
                                                    disabled={isPending}
                                                    onClick={() => runAction(actionKey, () => onClaim(expense.id))}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-(--accent) text-(--accent-contrast) text-xs font-bold hover:brightness-95 active:scale-95 disabled:opacity-50 transition-all"
                                                >
                                                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                    Ya pagué
                                                </button>
                                            </>
                                        ) : (
                                            <span className={`text-xs font-bold ${meta.badgeClass}`}>{meta.label}</span>
                                        )}
                                    </div>
                                </div>

                                {!isParticipantOwner && (paid > 0 || pendingClaim > 0) && status !== 'paid' && (
                                    <PaymentProgressBar owed={owed} paid={paid} pendingClaim={pendingClaim} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                tone="danger"
                title="¿Eliminar este gasto?"
                message="Esta acción no se puede deshacer. Se eliminará el gasto y el estado de pago de todos los participantes."
                confirmLabel="Eliminar"
                isLoading={isLoading}
                theme={theme}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </div>
    );
};
