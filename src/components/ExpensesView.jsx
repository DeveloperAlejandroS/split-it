import { useMemo, useState } from 'react';
import { ChevronRight, Plus, Receipt, X } from 'lucide-react';
import { ScreenHeader, NavAction } from './ui/ScreenHeader';
import { Avatar } from './ui/Avatar';
import { EmptyState } from './ui/EmptyState';
import { formatCurrency, displayNameOf, getExpenseStake, relativeDay } from '../utils/helpers';

const FILTERS = [
    { id: 'all', label: 'Todos' },
    { id: 'owed', label: 'Te deben' },
    { id: 'owe', label: 'Debes' },
];

const STAKE_COPY = {
    owed: { label: 'te deben', color: 'var(--success)' },
    owe: { label: 'debes', color: 'var(--danger)' },
    waiting: { label: 'esperando confirmación', color: 'var(--info)' },
    settled: { label: 'saldado', color: 'var(--text-muted)' },
};

const ExpenseRow = ({ expense, currentUserId, onOpen }) => {
    const stake = getExpenseStake(expense, currentUserId);
    const copy = STAKE_COPY[stake.kind];
    const payerName = expense.paid_by_me ? 'Pagaste tú' : `Pagó ${displayNameOf(expense.paid_by)}`;
    const people = (expense.participants?.length || 1) - 1;

    return (
        <button type="button" className="ios-row" onClick={() => onOpen(expense)}>
            <Avatar name={expense.paid_by_me ? 'Tú' : displayNameOf(expense.paid_by)} size={44} />
            <span className="min-w-0 flex-1">
                <span className="t-body block truncate font-medium">{expense.description}</span>
                <span className="t-footnote block truncate text-secondary">
                    {payerName} · {relativeDay(expense.created_at)}
                    {expense.paid_by_me && people > 0 ? ` · ${people} ${people === 1 ? 'persona' : 'personas'}` : ''}
                </span>
            </span>
            <span className="shrink-0 text-right">
                <span className="t-caption block" style={{ color: copy.color }}>{copy.label}</span>
                {stake.kind !== 'settled' && (
                    <span className="t-headline tabular block" style={{ color: copy.color }}>{formatCurrency(stake.amount)}</span>
                )}
            </span>
            <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
        </button>
    );
};

export const ExpensesView = ({ expenses, balance, currentUserId, filter, onFilterChange, onOpen, onAdd }) => {
    const [friendId, setFriendId] = useState(null);
    const [showAllFriends, setShowAllFriends] = useState(false);

    const byFriend = useMemo(
        () => (Array.isArray(balance?.by_friend) ? balance.by_friend.filter((f) => Math.abs(f.net) > 0.5) : []),
        [balance],
    );
    const shownFriends = showAllFriends ? byFriend : byFriend.slice(0, 3);
    const activeFriend = byFriend.find((f) => f.friend_id === friendId) || null;

    const visible = useMemo(() => {
        return expenses.filter((expense) => {
            const stake = getExpenseStake(expense, currentUserId);
            if (filter === 'owed' && stake.kind !== 'owed') return false;
            if (filter === 'owe' && stake.kind !== 'owe' && stake.kind !== 'waiting') return false;
            if (friendId) {
                const payerId = expense.paid_by?.id;
                const involves = payerId === friendId || (expense.participants || []).some((p) => p.user_id === friendId);
                if (!involves) return false;
            }
            return true;
        });
    }, [expenses, filter, friendId, currentUserId]);

    const pending = visible.filter((e) => getExpenseStake(e, currentUserId).kind !== 'settled');
    const settled = visible.filter((e) => getExpenseStake(e, currentUserId).kind === 'settled');

    const net = balance?.net_balance || 0;

    return (
        <section className="animate-fade-up">
            <ScreenHeader
                title="Gastos"
                subtitle="Lo que compartes con tus amigos"
                actions={<NavAction label="Nuevo gasto" tint onClick={onAdd}><Plus size={20} strokeWidth={2.4} /></NavAction>}
            />

            <div className="ios-card p-5">
                <p className="t-footnote text-secondary">Balance con tus amigos</p>
                <p
                    className="t-money-xl mt-1"
                    style={{ color: net > 0.5 ? 'var(--success)' : net < -0.5 ? 'var(--danger)' : 'var(--text-primary)' }}
                >
                    {net > 0.5 ? '+' : net < -0.5 ? '−' : ''}{formatCurrency(Math.abs(net))}
                </p>
                <p className="t-subhead mt-1 text-secondary">
                    {net > 0.5 ? 'En total, te deben más de lo que debes.' : net < -0.5 ? 'En total, debes más de lo que te deben.' : 'Estás al día con todos.'}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-[14px] p-3" style={{ background: 'var(--success-soft)' }}>
                        <p className="t-caption" style={{ color: 'var(--success)' }}>Te deben</p>
                        <p className="t-headline tabular" style={{ color: 'var(--success)' }}>{formatCurrency(balance?.owed_to_me || 0)}</p>
                    </div>
                    <div className="rounded-[14px] p-3" style={{ background: 'var(--danger-soft)' }}>
                        <p className="t-caption" style={{ color: 'var(--danger)' }}>Debes</p>
                        <p className="t-headline tabular" style={{ color: 'var(--danger)' }}>{formatCurrency(balance?.i_owe || 0)}</p>
                    </div>
                </div>
            </div>

            {byFriend.length > 0 && (
                <>
                    <p className="t-section px-4 pb-2 pt-6">Saldos por amigo</p>
                    <div className="ios-group">
                        {shownFriends.map((f) => {
                            const active = friendId === f.friend_id;
                            return (
                                <button
                                    key={f.friend_id}
                                    type="button"
                                    className="ios-row"
                                    aria-pressed={active}
                                    onClick={() => setFriendId(active ? null : f.friend_id)}
                                    style={active ? { background: 'var(--accent-soft)' } : undefined}
                                >
                                    <Avatar name={f.name} size={40} />
                                    <span className="min-w-0 flex-1">
                                        <span className="t-body block truncate font-medium">{f.name}</span>
                                        <span className="t-footnote block text-secondary">{f.net > 0 ? 'Te debe' : 'Le debes'}</span>
                                    </span>
                                    <span className="t-headline tabular" style={{ color: f.net > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                        {formatCurrency(Math.abs(f.net))}
                                    </span>
                                </button>
                            );
                        })}
                        {byFriend.length > 3 && (
                            <button type="button" className="ios-row justify-center" onClick={() => setShowAllFriends((v) => !v)}>
                                <span className="t-body" style={{ color: 'var(--accent)' }}>
                                    {showAllFriends ? 'Ver menos' : `Ver ${byFriend.length - 3} más`}
                                </span>
                            </button>
                        )}
                    </div>
                    <p className="t-footnote px-4 pt-2 text-secondary">Toca a un amigo para ver solo los gastos que tienen en común.</p>
                </>
            )}

            <div className="mt-6 flex items-center gap-2">
                <div className="segmented flex-1" role="group" aria-label="Filtrar gastos">
                    {FILTERS.map((f) => (
                        <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => onFilterChange(f.id)}>{f.label}</button>
                    ))}
                </div>
            </div>

            {activeFriend && (
                <button type="button" onClick={() => setFriendId(null)} className="btn btn-tinted btn-sm mt-3">
                    Con {activeFriend.name}
                    <X size={14} />
                </button>
            )}

            {visible.length === 0 ? (
                <div className="mt-4">
                    <EmptyState
                        icon={<Receipt size={26} />}
                        title={expenses.length === 0 ? 'Aún no hay gastos' : 'Nada que mostrar'}
                        message={
                            expenses.length === 0
                                ? 'Registra el primero: lo que pagaste y con quién se divide. Split.it hace las cuentas.'
                                : 'Ningún gasto coincide con este filtro.'
                        }
                        action={expenses.length === 0 ? <button type="button" className="btn btn-primary" onClick={onAdd}>Nuevo gasto</button> : undefined}
                    />
                </div>
            ) : (
                <>
                    {pending.length > 0 && (
                        <>
                            <p className="t-section px-4 pb-2 pt-5">Pendientes</p>
                            <div className="ios-group">
                                {pending.map((e) => <ExpenseRow key={e.id} expense={e} currentUserId={currentUserId} onOpen={onOpen} />)}
                            </div>
                        </>
                    )}
                    {settled.length > 0 && (
                        <>
                            <p className="t-section px-4 pb-2 pt-6">Saldados</p>
                            <div className="ios-group">
                                {settled.map((e) => <ExpenseRow key={e.id} expense={e} currentUserId={currentUserId} onOpen={onOpen} />)}
                            </div>
                        </>
                    )}
                </>
            )}
        </section>
    );
};
