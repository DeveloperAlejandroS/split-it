import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Amount } from './Amount';

export const BalanceCard = ({ balance, theme = 'dark', filter = 'all', onFilterChange }) => {
    const byFriend = Array.isArray(balance?.by_friend) ? balance.by_friend : [];

    return (
        <GlassCard className="relative overflow-hidden animate-balance-float glass-border" theme={theme}>
            <div className="absolute inset-0 bg-linear-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10 p-5 sm:p-6 flex flex-col gap-5">
                <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted mb-2">Balance neto</p>
                        <Amount
                            value={balance.net_balance}
                            showSign
                            theme={theme}
                            className="block text-4xl sm:text-5xl leading-none"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => onFilterChange?.(filter === 'owed' ? 'all' : 'owed')}
                            className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 text-left border transition-all duration-200 ${
                                filter === 'owed' ? 'bg-(--success-soft) border-(--success)/30' : 'border-(--surface-border) hover:bg-white/5'
                            }`}
                            style={{ background: filter === 'owed' ? undefined : 'var(--surface-soft)' }}
                        >
                            <span className="inline-flex h-8 w-8 rounded-full items-center justify-center shrink-0 bg-(--success-soft)">
                                <ArrowUpRight size={14} style={{ color: 'var(--success)' }} />
                            </span>
                            <span>
                                <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Te deben</span>
                                <Amount value={balance.owed_to_me} theme={theme} className="text-base" />
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => onFilterChange?.(filter === 'owe' ? 'all' : 'owe')}
                            className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 text-left border transition-all duration-200 ${
                                filter === 'owe' ? 'bg-(--danger-soft) border-(--danger)/30' : 'border-(--surface-border) hover:bg-white/5'
                            }`}
                            style={{ background: filter === 'owe' ? undefined : 'var(--surface-soft)' }}
                        >
                            <span className="inline-flex h-8 w-8 rounded-full items-center justify-center shrink-0 bg-(--danger-soft)">
                                <ArrowDownLeft size={14} style={{ color: 'var(--danger)' }} />
                            </span>
                            <span>
                                <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Debes</span>
                                <Amount value={balance.i_owe} theme={theme} className="text-base" />
                            </span>
                        </button>
                    </div>
                </div>

                {byFriend.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                        {byFriend.map((friend) => {
                            const isPositive = friend.net >= 0;
                            return (
                                <div
                                    key={friend.friend_id}
                                    className="shrink-0 flex items-center gap-2.5 rounded-full pl-1.5 pr-3.5 py-1.5 border"
                                    style={{
                                        background: 'var(--surface-soft)',
                                        borderColor: isPositive ? 'rgba(111, 207, 151, 0.28)' : 'rgba(232, 99, 122, 0.28)',
                                    }}
                                >
                                    <span
                                        className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                                    >
                                        {friend.name?.trim()?.charAt(0)?.toUpperCase() || '?'}
                                    </span>
                                    <span className="text-xs font-semibold text-primary truncate max-w-24">{friend.name}</span>
                                    <Amount value={friend.net} showSign theme={theme} className="text-xs" />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </GlassCard>
    );
};
