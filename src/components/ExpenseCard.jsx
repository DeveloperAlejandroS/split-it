import { History, Crown, User as UserIcon, ChevronRight, Clock } from 'lucide-react';
import { Amount } from './Amount';
import { formatCurrency, getParticipantStatus, numberOrZero } from '../utils/helpers';

export const ExpenseCard = ({
    expense,
    currentUserId,
    onOpenExpense,
    theme = 'dark',
    isFirst = false,
    isLast = false,
}) => {
    const isOwner = expense.paid_by_me;
    const ownerId = typeof expense.paid_by === 'object' ? expense.paid_by.id : expense.paid_by;
    const participants = expense.participants || [];
    const paidCount = participants.filter((p) => getParticipantStatus(p) === 'paid').length;
    const awaitingCount = participants.filter((p) => getParticipantStatus(p) === 'awaiting_confirmation').length;
    const pendingCount = participants.length - paidCount - awaitingCount;

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

                    <div className="min-w-0 space-y-1.5">
                        <div>
                            <h4 className="font-semibold text-primary leading-tight line-clamp-2" title={expense.description}>{expense.description}</h4>
                            <p className="text-xs text-muted mt-0.5">
                                {participants.length} participante{participants.length !== 1 ? 's' : ''}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-bold">
                            <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${
                                    isOwner ? 'bg-(--accent-soft) text-(--accent)' : 'bg-white/5 text-secondary'
                                }`}
                            >
                                <UserIcon size={10} />
                                {isOwner ? 'Tú pagaste' : 'Compartido'}
                            </span>
                            {paidCount > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-(--success-soft) text-(--success)">
                                    {paidCount} pagado{paidCount !== 1 ? 's' : ''}
                                </span>
                            )}
                            {awaitingCount > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-(--info-soft) text-(--info)">
                                    <Clock size={10} />
                                    {awaitingCount} esperando
                                </span>
                            )}
                            {pendingCount > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-(--neutral-chip) text-secondary">
                                    {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="text-right shrink-0">
                    <Amount value={expense.amount} theme={theme} className="block text-2xl" />
                </div>
            </div>

            <div className="mt-3.5 flex items-center justify-between gap-3">
                <div
                    className="relative flex-1 min-w-0 overflow-hidden"
                    style={{
                        WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
                        maskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
                    }}
                >
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {participants.slice(0, 6).map((participant) => {
                            const status = getParticipantStatus(participant);
                            const isThisParticipantMe = numberOrZero(participant.user_id) === currentUserId;
                            const isParticipantOwner = numberOrZero(participant.user_id) === numberOrZero(ownerId);

                            return (
                                <div
                                    key={participant.user_id}
                                    className="shrink-0 min-w-24 px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 flex items-center gap-1.5"
                                    title={formatCurrency(participant.amount_owed)}
                                >
                                    <div
                                        className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                                            isParticipantOwner
                                                ? 'bg-(--accent-soft) border-(--accent)/30 text-(--accent)'
                                                : isThisParticipantMe
                                                ? 'bg-(--info-soft) border-(--info)/30 text-(--info)'
                                                : 'bg-white/5 border-white/10 text-secondary'
                                        }`}
                                    >
                                        {isParticipantOwner ? <Crown size={10} /> : <UserIcon size={10} />}
                                    </div>
                                    <span className="text-[10px] font-semibold text-primary truncate">
                                        {isThisParticipantMe
                                            ? 'Yo'
                                            : participant.email?.split('@')[0] || 'User'}
                                    </span>
                                    <span
                                        className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                                        style={{
                                            background:
                                                status === 'paid'
                                                    ? 'var(--success)'
                                                    : status === 'awaiting_confirmation'
                                                    ? 'var(--info)'
                                                    : 'var(--text-muted)',
                                        }}
                                        aria-hidden="true"
                                    />
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
