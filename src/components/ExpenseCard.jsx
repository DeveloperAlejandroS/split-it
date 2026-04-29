import { useCallback } from 'react';
import { History, Crown, User as UserIcon, ChevronRight } from 'lucide-react';
import { Amount } from './Amount';
import { formatCurrency, getPersistentPaidStatus, numberOrZero } from '../utils/helpers';

export const ExpenseCard = ({
    expense,
    currentUserId,
    onSettle,
    onOpenExpense,
    isLoading,
    theme = 'dark',
    isFirst = false,
    isLast = false,
}) => {
    const isOwner = expense.paid_by_me;
    const ownerId = typeof expense.paid_by === 'object' ? expense.paid_by.id : expense.paid_by;
    const participants = expense.participants || [];
    const paidCount = participants.filter((p) => getPersistentPaidStatus(p)).length;
    const pendingCount = participants.length - paidCount;

    const handleParticipantClick = useCallback(
        (event, participant) => {
            event.stopPropagation();
            if (
                isOwner &&
                !getPersistentPaidStatus(participant) &&
                numberOrZero(participant.user_id) !== currentUserId
            ) {
                onSettle(expense.id, participant);
            }
        },
        [expense, isOwner, currentUserId, onSettle],
    );

    return (
        <article
            onClick={() => onOpenExpense?.(expense)}
            className={`group relative cursor-pointer transition-all active:scale-[0.99] px-5 py-4 hover:bg-white/5 ${
                isFirst ? 'rounded-t-3xl' : ''
            } ${isLast ? 'rounded-b-3xl' : ''}`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex items-start gap-4">
                    <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border"
                        style={{ background: 'var(--accent-soft)', borderColor: 'var(--surface-border)' }}
                    >
                        <History size={18} style={{ color: 'var(--accent)' }} />
                    </div>

                    <div className="min-w-0 space-y-2">
                        <div>
                            <h4 className="font-semibold text-primary leading-tight truncate">{expense.description}</h4>
                            <p className="text-xs text-secondary mt-1">
                                #{expense.id} · {participants.length} participante{participants.length !== 1 ? 's' : ''}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em] font-bold text-secondary">
                            <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${
                                    isOwner ? 'bg-violet-500/15 text-(--accent)' : 'bg-white/5 text-secondary'
                                }`}
                            >
                                <UserIcon size={10} />
                                {isOwner ? 'Tú pagaste' : 'Gasto compartido'}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-emerald-500/10 text-emerald-400">
                                Pagado {paidCount}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-rose-500/10 text-rose-400">
                                Pendiente {pendingCount}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="text-right shrink-0">
                    <Amount value={expense.amount} theme={theme} className="block text-2xl" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-secondary mt-1">Total</p>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
                {/*
                  FIX: Added a fade mask on the right edge so the user can see
                  there are more chips to scroll to. The mask is purely visual via
                  CSS mask-image; no JS required.
                */}
                <div
                    className="relative flex-1 min-w-0 overflow-hidden"
                    style={{
                        WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
                        maskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
                    }}
                >
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {participants.slice(0, 6).map((participant) => {
                            const isPaid = getPersistentPaidStatus(participant);
                            const isThisParticipantMe = numberOrZero(participant.user_id) === currentUserId;
                            const isParticipantOwner = numberOrZero(participant.user_id) === numberOrZero(ownerId);

                            return (
                                <div
                                    key={participant.user_id}
                                    className="shrink-0 min-w-28 p-2 rounded-2xl border border-white/10 bg-white/5"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <div
                                            className={`w-6 h-6 rounded-lg flex items-center justify-center border ${
                                                isParticipantOwner
                                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                                    : isThisParticipantMe
                                                    ? 'bg-violet-500/15 border-violet-500/30 text-(--accent)'
                                                    : 'bg-white/5 border-white/10 text-secondary'
                                            }`}
                                        >
                                            {isParticipantOwner ? <Crown size={11} /> : <UserIcon size={11} />}
                                        </div>
                                        <span className="text-[10px] font-semibold text-primary truncate">
                                            {isThisParticipantMe
                                                ? 'Yo'
                                                : participant.email?.split('@')[0] || 'User'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-semibold text-secondary">
                                        {isParticipantOwner ? 'Owner' : isPaid ? 'Pagado' : 'Pendiente'}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div
                    className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold"
                    style={{ color: 'var(--accent)' }}
                >
                    Ver
                    <ChevronRight size={14} />
                </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 h-px bg-white/5 opacity-80" />
        </article>
    );
};
