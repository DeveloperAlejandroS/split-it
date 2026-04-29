import { Wallet, RefreshCw } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { ExpenseCard } from './ExpenseCard';

const isOwedToMe = (expense) => Boolean(expense?.paid_by_me);

const isMyDebt = (expense, currentUserId) => {
    const participants = Array.isArray(expense?.participants) ? expense.participants : [];
    return participants.some(
        (p) => Number(p?.user_id) === Number(currentUserId) && !p?.is_paid && !expense?.paid_by_me,
    );
};

export const ExpenseList = ({
    expenses,
    currentUserId,
    onSettle,
    onOpenExpense,
    onRefresh,
    isLoading,
    filter = 'all',
    theme = 'dark',
}) => {
    const filteredExpenses = expenses.filter((expense) => {
        if (filter === 'owed') return isOwedToMe(expense);
        if (filter === 'owe') return isMyDebt(expense, currentUserId);
        return true;
    });

    const totals = filteredExpenses.reduce(
        (acc, exp) => {
            const participants = Array.isArray(exp.participants) ? exp.participants : [];
            participants.forEach((p) => {
                acc.participants += 1;
                const paid =
                    p?.is_paid === true ||
                    p?.is_paid === 1 ||
                    p?.is_paid === 'true' ||
                    p?.is_paid === '1';
                if (paid) acc.paid += 1;
                else acc.pending += 1;
            });
            return acc;
        },
        { participants: 0, paid: 0, pending: 0 },
    );

    const Header = () => (
        <div className="flex items-center justify-between px-2">
            <div>
                <h3 className="text-lg font-bold text-primary">Actividad</h3>
                {filteredExpenses.length > 0 && (
                    <p className="text-xs text-secondary">Lista unificada de gastos compartidos</p>
                )}
            </div>
            <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 rounded-full transition-all duration-500 disabled:opacity-50"
                style={{
                    background: 'var(--surface-soft)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text-secondary)',
                }}
                aria-label="Refrescar gastos"
            >
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
        </div>
    );

    if (filteredExpenses.length === 0) {
        return (
            <section className="space-y-6">
                <Header />
                <GlassCard theme={theme} className="py-20 text-center">
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border"
                        style={{
                            background: 'var(--surface-soft)',
                            borderColor: 'var(--surface-border)',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        <Wallet size={24} />
                    </div>
                    <p className="text-secondary text-sm">No hay gastos registrados</p>
                </GlassCard>
            </section>
        );
    }

    return (
        <section className="space-y-6">
            <Header />

            {/* Summary stats */}
            <GlassCard theme={theme} className="grid grid-cols-3 gap-3 p-4">
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-secondary">Gastos</p>
                    <p className="text-xl font-bold text-primary">{filteredExpenses.length}</p>
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-secondary">Participantes</p>
                    <p className="text-xl font-bold text-primary">{totals.participants}</p>
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-secondary">Pendientes</p>
                    <p className="text-xl font-bold text-amber-400">{totals.pending}</p>
                </div>
            </GlassCard>

            {/* Expense cards */}
            <GlassCard theme={theme} className="overflow-hidden">
                <div className="divide-y divide-white/5">
                    {filteredExpenses.map((exp, index) => (
                        <ExpenseCard
                            key={exp.id}
                            expense={exp}
                            currentUserId={currentUserId}
                            onSettle={onSettle}
                            onOpenExpense={onOpenExpense}
                            isLoading={isLoading}
                            theme={theme}
                            isFirst={index === 0}
                            isLast={index === filteredExpenses.length - 1}
                        />
                    ))}
                </div>
            </GlassCard>
        </section>
    );
};
