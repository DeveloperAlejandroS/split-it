import { useMemo, useState } from 'react';
import { CaretRight, Check, Receipt, UsersThree, X } from '@phosphor-icons/react';
import { ScreenHeader, NavAction } from './ui/ScreenHeader';
import { Avatar } from './ui/Avatar';
import { EmptyState } from './ui/EmptyState';
import { displayNameOf, formatCurrency, getExpenseStake, relativeDay } from '../utils/helpers';

const FILTERS = [
    { id: 'all', label: 'Todos' },
    { id: 'owed', label: 'Te deben' },
    { id: 'owe', label: 'Debes' },
];

// Más saldados que esto se pliegan: una lista que crece sin tope entierra lo pendiente.
const SETTLED_FOLD = 5;

const STAKE = {
    owed: { label: 'Te deben', color: 'var(--pos)', bg: 'var(--pos-soft)' },
    owe: { label: 'Debes', color: 'var(--neg)', bg: 'var(--neg-soft)' },
    // Quien debe y ya avisó: solo le toca esperar.
    waiting: { label: 'Esperando', color: 'var(--info)', bg: 'var(--info-soft)' },
    settled: { label: 'Saldado', color: 'var(--ink-3)', bg: 'var(--card-soft)' },
};

// Quien cobra y alguien ya avisó que pagó: es una acción suya (violeta = tu acción).
const NEEDS_CONFIRM = { label: 'Por confirmar', color: 'var(--primary-ink)', bg: 'var(--primary-soft)' };

const needsConfirmation = (stake) => stake.kind === 'owed' && stake.awaiting > 0;

const ExpenseRow = ({ expense, currentUserId, onOpen }) => {
    const stake = getExpenseStake(expense, currentUserId);
    const s = STAKE[stake.kind];
    // El monto conserva el color de su significado; solo la etiqueta cambia si hay algo por confirmar.
    const chip = needsConfirmation(stake) ? NEEDS_CONFIRM : s;
    const people = (expense.participants?.length || 1) - 1;
    return (
        <button type="button" className="row" onClick={() => onOpen(expense)}>
            <span className="bubble h-12 w-12" style={{ background: s.bg, color: s.color }}><Receipt size={24} weight="duotone" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
                <span className="body block truncate font-semibold">{expense.description}</span>
                <span className="small block truncate">
                    {expense.paid_by_me ? 'Pagaste' : `Pagó ${displayNameOf(expense.paid_by)}`} · {relativeDay(expense.created_at)}
                    {expense.paid_by_me && people > 0 ? ` · ${people} ${people === 1 ? 'persona' : 'personas'}` : ''}
                </span>
            </span>
            <span className="shrink-0 text-right">
                <span className="chip" style={{ background: chip.bg, color: chip.color }}>{chip.label}</span>
                {stake.kind !== 'settled' && <span className="money mt-1 block" style={{ color: s.color }}>{formatCurrency(stake.amount)}</span>}
            </span>
            <CaretRight size={16} weight="bold" style={{ color: 'var(--ink-3)' }} className="shrink-0" aria-hidden="true" />
        </button>
    );
};

export const ExpensesView = ({ expenses, balance, currentUserId, filter, onFilterChange, onOpen, onAdd, onOpenFriends, friendBadge }) => {
    const [friendId, setFriendId] = useState(null);
    const [showSettled, setShowSettled] = useState(false);

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

    // Lo que espera tu confirmación va primero; el resto conserva su orden.
    const pending = useMemo(() => {
        const open = visible.filter((e) => getExpenseStake(e, currentUserId).kind !== 'settled');
        const rank = (e) => (needsConfirmation(getExpenseStake(e, currentUserId)) ? 0 : 1);
        return [...open].sort((a, b) => rank(a) - rank(b));
    }, [visible, currentUserId]);
    const settled = visible.filter((e) => getExpenseStake(e, currentUserId).kind === 'settled');
    const foldSettled = settled.length > SETTLED_FOLD && !showSettled;
    const net = balance?.net_balance || 0;
    const hasActiveFilters = filter !== 'all' || friendId !== null;

    const clearFilters = () => { onFilterChange('all'); setFriendId(null); };

    return (
        <section>
            <ScreenHeader
                title="Gastos"
                subtitle="Lo que compartes con tus amigos"
                actions={<NavAction label="Amigos" badge={friendBadge} onClick={onOpenFriends}><UsersThree size={22} weight="bold" /></NavAction>}
            />

            <div className="stagger flex flex-col gap-5">
                <div className="hero p-5">
                    <p className="small">Neto con tus amigos</p>
                    <p className="money-lg mt-1.5">{net > 0.5 ? '+' : net < -0.5 ? '−' : ''}{formatCurrency(Math.abs(net))}</p>
                    <p className="small mt-1.5">
                        {net > 0.5 ? 'Te deben más de lo que debes. Aún no es tuyo: cuenta cuando te paguen.' : net < -0.5 ? 'Debes más de lo que te deben.' : 'Estás al día con todos.'}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-[18px] p-3" style={{ background: 'rgba(255,255,255,0.16)' }}>
                            <span className="tiny" style={{ color: 'rgba(255,255,255,0.92)' }}>Te deben</span>
                            <span className="money-md mt-1 block">{formatCurrency(balance?.owed_to_me || 0)}</span>
                        </div>
                        <div className="rounded-[18px] p-3" style={{ background: 'rgba(255,255,255,0.16)' }}>
                            <span className="tiny" style={{ color: 'rgba(255,255,255,0.92)' }}>Debes</span>
                            <span className="money-md mt-1 block">{formatCurrency(balance?.i_owe || 0)}</span>
                        </div>
                    </div>
                </div>

                <div className="segmented segmented-lg" role="group" aria-label="Filtrar gastos">
                    {FILTERS.map((f) => (
                        <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => onFilterChange(f.id)}>{f.label}</button>
                    ))}
                </div>

                {byFriend.length > 0 && (
                    <div>
                        {byFriend.length > 1 && <p className="small mb-2 px-1">Toca a un amigo para ver solo lo que tienen en común.</p>}
                        <div className="snap-x-row scrollbar-hide" role="group" aria-label="Filtrar por amigo">
                            {byFriend.map((f) => {
                                const active = friendId === f.friend_id;
                                const positive = f.net > 0;
                                const first = String(f.name).split(' ')[0];
                                const word = positive ? 'te debe' : 'le debes';
                                const amount = formatCurrency(Math.abs(f.net));
                                return (
                                    <button
                                        key={f.friend_id}
                                        type="button"
                                        aria-pressed={active}
                                        aria-label={`${first}, ${word} ${amount}. Filtrar gastos con ${first}`}
                                        onClick={() => setFriendId(active ? null : f.friend_id)}
                                        className="card flex h-14 min-w-[150px] items-center gap-2.5 rounded-full pl-2 pr-4 text-left transition-transform active:scale-95"
                                        style={active ? { boxShadow: '0 0 0 2px var(--primary), var(--shadow)' } : undefined}
                                    >
                                        <Avatar name={f.name} size={40} />
                                        <span className="min-w-0 flex-1">
                                            <span className="small block max-w-[120px] truncate font-semibold" style={{ color: 'var(--ink)' }}>{first}</span>
                                            <span className="tiny block whitespace-nowrap font-semibold" style={{ color: positive ? 'var(--pos)' : 'var(--neg)' }}>{word} {amount}</span>
                                        </span>
                                        {active && <Check size={16} weight="bold" style={{ color: 'var(--primary)' }} className="shrink-0" aria-hidden="true" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeFriend && (
                    <button type="button" onClick={() => setFriendId(null)} className="btn btn-tinted btn-sm btn-44 self-start">
                        Con {String(activeFriend.name).split(' ')[0]} <X size={14} weight="bold" />
                    </button>
                )}

                {visible.length === 0 ? (
                    <EmptyState
                        icon={<Receipt size={32} weight="duotone" />}
                        title={expenses.length === 0 ? 'Aún no hay gastos' : 'Nada que mostrar'}
                        message={expenses.length === 0 ? 'Registra el primero: lo que pagaste y con quién se divide. Split.it hace las cuentas.' : 'Ningún gasto coincide con este filtro.'}
                        action={expenses.length === 0
                            ? <button type="button" className="btn btn-primary" onClick={onAdd}>Nuevo gasto</button>
                            : hasActiveFilters ? <button type="button" className="btn btn-tinted" onClick={clearFilters}>Quitar filtros</button> : undefined}
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
                                {foldSettled ? (
                                    <button type="button" className="row" onClick={() => setShowSettled(true)}>
                                        <span className="body flex-1 font-semibold">Ver los {settled.length} saldados</span>
                                        <CaretRight size={16} weight="bold" style={{ color: 'var(--ink-3)' }} aria-hidden="true" />
                                    </button>
                                ) : (
                                    <div className="stack">{settled.map((e) => <ExpenseRow key={e.id} expense={e} currentUserId={currentUserId} onOpen={onOpen} />)}</div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
};
