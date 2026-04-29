import { ArrowDownLeft, ArrowUpRight, Filter } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Amount } from './Amount';

export const BalanceCard = ({ balance, theme = 'dark', filter = 'all', onFilterChange }) => {
    const isLight = theme === 'light';

    return (
        <GlassCard className="relative overflow-hidden animate-balance-float glass-border" theme={theme}>
            <div className="absolute inset-0 bg-linear-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10 p-5 sm:p-6">
                {/*
                  FIX: was always a 2-col grid even on tiny screens.
                  Now stacks to single col on xs, returns to 2-col at sm+.
                */}
                <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr] gap-4 items-stretch">
                    {/* Net balance block */}
                    <div
                        className="rounded-[1.6rem] p-5 sm:p-6 border border-white/10 flex flex-col justify-between"
                        style={{ background: 'var(--surface-soft)', minHeight: 160 }}
                    >
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-secondary mb-3">Balance neto</p>
                            <Amount
                                value={balance.net_balance}
                                showSign
                                theme={theme}
                                className="block text-4xl sm:text-5xl xl:text-6xl leading-none"
                            />
                        </div>

                        <div className="mt-5 flex items-center gap-2 text-xs text-secondary">
                            <Filter size={14} />
                            <span>Toca los indicadores para filtrar el feed.</span>
                        </div>
                    </div>

                    {/* Owed / Owe buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-1 sm:grid-rows-2 gap-3">
                        <button
                            type="button"
                            onClick={() => onFilterChange?.(filter === 'owed' ? 'all' : 'owed')}
                            className={`rounded-[1.4rem] p-4 text-left border transition-all duration-200 ${
                                filter === 'owed'
                                    ? 'bg-emerald-500/15 border-emerald-400/30'
                                    : 'border-white/10 hover:bg-white/10'
                            }`}
                            style={{ background: filter === 'owed' ? undefined : 'var(--surface-soft)' }}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span
                                    className="inline-flex h-8 w-8 rounded-full items-center justify-center"
                                    style={{ background: isLight ? 'rgba(16,185,129,0.12)' : 'rgba(52,211,153,0.12)' }}
                                >
                                    <ArrowUpRight size={14} className="text-emerald-400" />
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-secondary">Te deben</span>
                            </div>
                            <Amount value={balance.owed_to_me} theme={theme} className="text-lg" />
                        </button>

                        <button
                            type="button"
                            onClick={() => onFilterChange?.(filter === 'owe' ? 'all' : 'owe')}
                            className={`rounded-[1.4rem] p-4 text-left border transition-all duration-200 ${
                                filter === 'owe'
                                    ? 'bg-rose-500/15 border-rose-400/30'
                                    : 'border-white/10 hover:bg-white/10'
                            }`}
                            style={{ background: filter === 'owe' ? undefined : 'var(--surface-soft)' }}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span
                                    className="inline-flex h-8 w-8 rounded-full items-center justify-center"
                                    style={{ background: isLight ? 'rgba(244,63,94,0.12)' : 'rgba(251,113,133,0.12)' }}
                                >
                                    <ArrowDownLeft size={14} className="text-rose-400" />
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-secondary">Debes</span>
                            </div>
                            <Amount value={balance.i_owe} theme={theme} className="text-lg" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Ambient glow that reacts to net balance */}
            <div
                className="absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full translate-x-10 -translate-y-10 pointer-events-none"
                style={{
                    background: balance.net_balance >= 0
                        ? 'rgba(52,211,153,0.12)'
                        : 'rgba(251,113,133,0.12)',
                }}
            />
        </GlassCard>
    );
};
