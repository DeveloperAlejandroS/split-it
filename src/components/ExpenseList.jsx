import { Wallet, RefreshCw } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { ExpenseCard } from './ExpenseCard';
import { getParticipantStatus } from '../utils/helpers';

const isOwedToMe = (expense) => Boolean(expense?.paid_by_me);

const isMyDebt = (expense, currentUserId) => {
    const participants = Array.isArray(expense?.participants) ? expense.participants : [];
    return participants.some(
        (p) => Number(p?.user_id) === Number(currentUserId) && getParticipantStatus(p) !== 'paid' && !expense?.paid_by_me,
    );
};

const ListHeader = ({ count, pendingCount, onRefresh, isLoading }) => (
    <div className="flex items-center justify-between px-2">
        <div>
            <h3 className="text-lg font-bold text-primary">Actividad</h3>
            {count > 0 && (
                <p className="text-xs text-muted mt-0.5">
                    {count} gasto{count !== 1 ? 's' : ''}
                    {pendingCount > 0 ? ` · ${pendingCount} sin liquidar` : ''}
                </p>
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

export const ExpenseList = ({
    expenses,
    currentUserId,
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

    const pendingCount = filteredExpenses.reduce((acc, exp) => {
        const participants = Array.isArray(exp.participants) ? exp.participants : [];
        return acc + participants.filter((p) => getParticipantStatus(p) !== 'paid').length;
    }, 0);

    if (filteredExpenses.length === 0) {
        return (
            <section className="space-y-5">
                <ListHeader count={0} pendingCount={0} onRefresh={onRefresh} isLoading={isLoading} />
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
        <section className="space-y-5">
            <ListHeader
                count={filteredExpenses.length}
                pendingCount={pendingCount}
                onRefresh={onRefresh}
                isLoading={isLoading}
            />

            <GlassCard theme={theme} className="overflow-hidden">
                <div className="divide-y divide-white/5">
                    {filteredExpenses.map((exp, index) => (
                        <ExpenseCard
                            key={exp.id}
                            expense={exp}
                            currentUserId={currentUserId}
                            onOpenExpense={onOpenExpense}
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
