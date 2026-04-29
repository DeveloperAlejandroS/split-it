import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { formatCurrency, getPersistentPaidStatus, numberOrZero } from '../utils/helpers';

export const ExpenseDetailModal = ({
    expense,
    currentUserId,
    onClose,
    onSettle,
    isLoading,
    theme = 'dark',
}) => {
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

    const handleParticipantClick = (participant) => {
        if (
            isOwner &&
            !getPersistentPaidStatus(participant) &&
            numberOrZero(participant.user_id) !== currentUserId
        ) {
            onSettle(expense.id, participant);
        }
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
                    <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-secondary">Detalle del gasto</p>
                        <h4 className="text-2xl font-bold text-primary mt-2 leading-tight">{expense.description}</h4>
                        <p className="text-sm text-secondary mt-2">Total: {formatCurrency(expense.amount)}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                        aria-label="Cerrar detalle"
                    >
                        <X size={18} className="text-secondary" />
                    </button>
                </div>

                {/* Participant list */}
                <div className="p-6 sm:p-7 space-y-3 overflow-y-auto max-h-[calc(88vh-100px)]">
                    {participants.map((participant) => {
                        const isPaid = getPersistentPaidStatus(participant);
                        const isThisParticipantMe = numberOrZero(participant.user_id) === currentUserId;
                        const isParticipantOwner = numberOrZero(participant.user_id) === numberOrZero(ownerId);
                        const canSettle = isOwner && !isThisParticipantMe && !isPaid && !isParticipantOwner;

                        return (
                            <div
                                key={participant.user_id}
                                className="p-4 rounded-2xl border border-white/10 bg-black/20 flex items-center justify-between gap-4"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-semibold text-primary truncate">
                                            {isThisParticipantMe ? 'Yo' : participant.email || 'Usuario'}
                                        </span>
                                        {isParticipantOwner && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold uppercase tracking-widest">
                                                Pagador
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-secondary">
                                        Debe: {formatCurrency(participant.amount_owed)}
                                    </p>
                                </div>

                                {isParticipantOwner ? (
                                    <span className="text-xs font-bold text-amber-400">Owner</span>
                                ) : isPaid ? (
                                    <span className="text-xs font-bold text-emerald-400">Pagado ✓</span>
                                ) : canSettle ? (
                                    <button
                                        disabled={isLoading}
                                        onClick={() => handleParticipantClick(participant)}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 active:scale-95 disabled:opacity-50 transition-all"
                                    >
                                        <CheckCircle2 size={14} />
                                        Liquidar
                                    </button>
                                ) : (
                                    <span className="text-xs font-bold text-amber-400">Pendiente</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
