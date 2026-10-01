import { useMemo, useState } from 'react';
import { CaretRight, Receipt, UsersThree, X } from '@phosphor-icons/react';
import { ScreenHeader, NavAction } from './ui/ScreenHeader';
import { Avatar } from './ui/Avatar';
import { EmptyState } from './ui/EmptyState';
import { displayNameOf, formatCurrency, getExpenseStake, relativeDay } from '../utils/helpers';

const FILTERS = [
    { id: 'all', label: 'Todos' },
    { id: 'owed', label: 'Te deben' },
    { id: 'owe', label: 'Debes' },
];

const STAKE = {
    owed: { label: 'Te deben', color: 'var(--pos)', bg: 'var(--pos-soft)' },
    owe: { label: 'Debes', color: 'var(--neg)', bg: 'var(--neg-soft)' },
    waiting: { label: 'Por confirmar', color: 'var(--info)', bg: 'var(--info-soft)' },
    settled: { label: 'Saldado', color: 'var(--ink-3)', bg: 'var(--card-soft)' },
};

const ExpenseRow = ({ expense, currentUserId, onOpen }) => {
    const stake = getExpenseStake(expense, currentUserId);
    const s = STAKE[stake.kind];
    const people = (expense.participants?.length || 1) - 1;
    return (
        <button type="button" className="row" onClick={() => onOpen(expense)}>
            <span className="bubble h-12 w-12" style={{ background: s.bg, color: s.color }}><Receipt size={24} weight="duotone" /></span>
            <span className="min-w-0 flex-1">
                <span className="body block truncate font-semibold">{expense.description}</span>
                <span className="small block truncate">
                    {expense.paid_by_me ? 'Pagaste tú' : `Pagó ${displayNameOf(expense.paid_by)}`} · {relativeDay(expense.created_at)}
                    {expense.paid_by_me && people > 0 ? ` · ${people} ${people === 1 ? 'persona' : 'personas'}` : ''}
                </span>
            </span>
            <span className="shrink-0 text-right">
                <span className="chip" style={{ background: s.bg, color: s.color, height: 22, fontSize: 11 }}>{s.label}</span>
                {stake.kind !== 'settled' && <span className="money mt-1 block" style={{ color: s.color }}>{formatCurrency(stake.amount)}</span>}
            </span>
            <CaretRight size={16} weight="bold" style={{ color: 'var(--ink-3)' }} className="shrink-0" />
        </button>
    );
};

export const ExpensesView = ({ expenses, balance, currentUserId, filter, onFilterChange, onOpen, onAdd, onOpenFriends, friendBadge }) => {
    const [friendId, setFriendId] = useState(null);

    const byFriend = useMemo(
        () => (Array.isArray(balance?.by_friend) ? balance.by_friend.filter((f) => Math.abs(f.net) > 0.5) : []),
        [balance],
    );
    const activeFriend = byFriend.find((f) => f.friend_id === friendId) || null;

    const visible = useMemo(() => expenses.filter((expense) => {
        const stake = getExpenseStake(expense, currentUserId);
        if (filter === 'owed' && stake.kind !== 'owed') return false;
        if (filter === 'owe' && stake.kind !== 'owe' && stake.kind !== 'waiting') return false;
        if (friendId) {
            const involves = expense.paid_by?.id === friendId || (expense.participants || []).some((p) => p.user_id === friendId);
            if (!involves) return false;
        }
        return true;
    }), [expenses, filter, friendId, currentUserId]);

    const pending = visible.filter((e) => getExpenseStake(e, currentUserId).kind !== 'settled');
    const settled = visible.filter((e) => getExpenseStake(e, currentUserId).kind === 'settled');
    const net = balance?.net_balance || 0;

    return (
        <section>
            <ScreenHeader
                title="Gastos"
                subtitle="Lo que compartes con tus amigos"
                actions={<NavAction label="Amigos" badge={friendBadge} onClick={onOpenFriends}><UsersThree size={22} weight="bold" /></NavAction>}
            />

            <div className="stagger flex flex-col gap-5">
                <div className="hero p-6">
                    <p className="small">Balance con tus amigos</p>
                    <p className="money-xl mt-2">{net > 0.5 ? '+' : net < -0.5 ? '−' : ''}{formatCurrency(Math.abs(net))}</p>
                    <p className="small mt-2">
                        {net > 0.5 ? 'En total te deben más de lo que debes.' : net < -0.5 ? 'En total debes más de lo que te deben.' : 'Estás al día con todos.'}
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-[18px] p-3" style={{ background: 'rgba(255,255,255,0.16)' }}>
                            <span className="tiny" style={{ color: 'rgba(255,255,255,0.8)' }}>Te deben</span>
                            <span className="money mt-1 block text-[18px]">{formatCurrency(balance?.owed_to_me || 0)}</span>
                        </div>
                        <div className="rounded-[18px] p-3" style={{ background: 'rgba(255,255,255,0.16)' }}>
                            <span className="tiny" style={{ color: 'rgba(255,255,255,0.8)' }}>Debes</span>
                            <span className="money mt-1 block text-[18px]">{formatCurrency(balance?.i_owe || 0)}</span>
                        </div>
                    </div>
                </div>

                {byFriend.length > 0 && (
                    <div>
                        <h2 className="title mb-1">Con quién</h2>
                        <p className="small mb-3">Toca a un amigo para ver solo lo que tienen en común.</p>
                        <div className="snap-x-row scrollbar-hide">
                            {byFriend.map((f) => {
                                const active = friendId === f.friend_id;
                                const positive = f.net > 0;
                                return (
                                    <button
                                        key={f.friend_id}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => setFriendId(active ? null : f.friend_id)}
                                        className="card flex w-[112px] flex-col items-center gap-2 px-3 py-4 transition-transform active:scale-95"
                                        style={active ? { boxShadow: '0 0 0 2px var(--primary), var(--shadow)' } : undefined}
                                    >
                                        <Avatar name={f.name} size={52} />
                                        <span className="small w-full truncate text-center font-semibold" style={{ color: 'var(--ink)' }}>{String(f.name).split(' ')[0]}</span>
                                        <span className="chip" style={{ background: positive ? 'var(--pos-soft)' : 'var(--neg-soft)', color: positive ? 'var(--pos)' : 'var(--neg)', height: 24 }}>{formatCurrency(Math.abs(f.net))}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="segmented" role="group" aria-label="Filtrar gastos">
                    {FILTERS.map((f) => (
                        <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => onFilterChange(f.id)}>{f.label}</button>
                    ))}
                </div>

                {activeFriend && (
                    <button type="button" onClick={() => setFriendId(null)} className="btn btn-tinted btn-sm self-start">
                        Con {String(activeFriend.name).split(' ')[0]} <X size={14} weight="bold" />
                    </button>
                )}

                {visible.length === 0 ? (
                    <EmptyState
                        icon={<Receipt size={32} weight="duotone" />}
                        title={expenses.length === 0 ? 'Aún no hay gastos' : 'Nada que mostrar'}
                        message={expenses.length === 0 ? 'Registra el primero: lo que pagaste y con quién se divide. Split.it hace las cuentas.' : 'Ningún gasto coincide con este filtro.'}
                        action={expenses.length === 0 ? <button type="button" className="btn btn-primary" onClick={onAdd}>Nuevo gasto</button> : undefined}
                    />
                ) : (
                    <>
                        {pending.length > 0 && (
                            <div>
                                <h2 className="title mb-3">Pendientes</h2>
                                <div className="stack">{pending.map((e) => <ExpenseRow key={e.id} expense={e} currentUserId={currentUserId} onOpen={onOpen} />)}</div>
                            </div>
                        )}
                        {settled.length > 0 && (
                            <div>
                                <h2 className="title mb-3">Saldados</h2>
                                <div className="stack" style={{ opacity: 0.85 }}>{settled.map((e) => <ExpenseRow key={e.id} expense={e} currentUserId={currentUserId} onOpen={onOpen} />)}</div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
};
