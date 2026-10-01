import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Bell, CaretRight, ChartPieSlice, CircleNotch, Clock, HandCoins, Money, PiggyBank, Receipt, Wallet, UsersThree } from '@phosphor-icons/react';
import { ScreenHeader, NavAction } from './ui/ScreenHeader';
import { Avatar } from './ui/Avatar';
import { Donut } from './ui/Donut';
import { AnimatedNumber } from './AnimatedNumber';
import { API_URL } from '../config/api';
import { getCurrentMonthKey } from '../utils/budgetHelpers';
import {
    displayNameOf,
    firstNameOf,
    formatCurrency,
    getExpenseStake,
    getParticipantStatus,
    numberOrZero,
    relativeDay,
} from '../utils/helpers';

const TOKEN_KEY = 'splitit_jwt';

const Bubble = ({ children, tone = 'violet', size = 44 }) => {
    const tones = {
        violet: { bg: 'var(--card-tint)', fg: 'var(--primary)' },
        teal: { bg: 'var(--pos-soft)', fg: 'var(--pos)' },
        coral: { bg: 'var(--neg-soft)', fg: 'var(--neg)' },
        warn: { bg: 'var(--warn-soft)', fg: 'var(--warn)' },
    };
    const t = tones[tone] || tones.violet;
    return <span className="bubble" style={{ width: size, height: size, background: t.bg, color: t.fg }}>{children}</span>;
};

export const HomeView = ({
    currentUser,
    expenses = [],
    pendingFriendRequests = [],
    balance,
    onNavigate,
    onOpenExpense,
    onOpenAccount,
    banner,
    refreshKey = 0,
}) => {
    const [budget, setBudget] = useState(null);
    const [libreta, setLibreta] = useState({ total_pending: 0 });
    const [debts, setDebts] = useState({ total_pending: 0 });
    const [isLoading, setIsLoading] = useState(true);

    const loadAll = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const headers = { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`, Accept: 'application/json' };
            const [b, l, d] = await Promise.all([
                fetch(`${API_URL}/budget/${getCurrentMonthKey()}`, { headers }),
                fetch(`${API_URL}/libreta`, { headers }),
                fetch(`${API_URL}/debts`, { headers }),
            ]);
            const [bj, lj, dj] = await Promise.all([b.json(), l.json(), d.json()]);
            if (b.ok) setBudget(bj);
            if (l.ok) setLibreta(lj);
            if (d.ok) setDebts(dj);
        } catch {
            // Inicio es un resumen: si una fuente falla, las demás igual se pintan.
        } finally {
            setIsLoading(false);
        }
    }, []);

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => { loadAll(); }, [loadAll]);
    // Cambios en vivo: se recarga sin estado de carga (nada parpadea).
    useEffect(() => { if (refreshKey > 0) loadAll(true); }, [refreshKey, loadAll]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const cash = numberOrZero(budget?.totals?.balance);
    const savings = numberOrZero(budget?.totals?.savings_balance);
    const monthlyMargin = numberOrZero(budget?.totals?.actual_net);
    const libretaPending = numberOrZero(libreta.total_pending);
    const debtPending = numberOrZero(debts.total_pending);
    const owedToMe = numberOrZero(balance?.owed_to_me) + libretaPending;
    const iOwe = numberOrZero(balance?.i_owe) + debtPending;

    // Patrimonio neto: todo lo tuyo (caja, ahorros, lo que te deben) menos lo
    // que debes. "Disponible" se muestra aparte y nunca cuenta lo que aún no
    // te pagan.
    const netWorth = cash + savings + owedToMe - iOwe;

    const today = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

    const spending = useMemo(() => {
        const s = budget?.sections;
        if (!s) return [];
        return [
            { label: 'Fijos', value: numberOrZero(s.fixed_expense.actual_total), color: '#5b2ee5' },
            { label: 'Día a día', value: numberOrZero(s.tracked_expense.actual_total), color: '#a595ff' },
            { label: 'Deudas', value: numberOrZero(s.debt.actual_total), color: '#ff7a3d' },
            { label: 'Ahorros', value: numberOrZero(s.saving.actual_total), color: '#20d3c2' },
        ];
    }, [budget]);
    const spendingTotal = spending.reduce((sum, s) => sum + s.value, 0);

    // Lo que espera una acción tuya, ordenado por urgencia.
    const attention = useMemo(() => {
        const items = [];
        expenses.forEach((expense) => {
            (expense.participants || []).forEach((p) => {
                if (expense.paid_by_me && getParticipantStatus(p) === 'awaiting_confirmation') {
                    items.push({
                        key: `c-${expense.id}-${p.user_id}`,
                        title: `${firstNameOf(p)} dice que te pagó`,
                        amount: formatCurrency(p.pending_claim_amount),
                        hint: `${expense.description}. Confírmalo.`,
                        icon: <Clock size={22} weight="fill" />,
                        run: () => onOpenExpense(expense),
                    });
                }
            });
            if (!expense.paid_by_me) {
                const stake = getExpenseStake(expense, currentUser?.id);
                if (stake.kind === 'owe') {
                    items.push({
                        key: `o-${expense.id}`,
                        title: `Le debes a ${firstNameOf(expense.paid_by)}`,
                        amount: formatCurrency(stake.amount),
                        hint: expense.description,
                        icon: <Receipt size={22} weight="fill" />,
                        run: () => onOpenExpense(expense),
                    });
                }
            }
        });
        if (pendingFriendRequests.length > 0) {
            items.unshift({
                key: 'fr',
                title: pendingFriendRequests.length === 1 ? 'Solicitud de amistad' : `${pendingFriendRequests.length} solicitudes de amistad`,
                amount: '',
                hint: 'Acéptalas para dividir gastos.',
                icon: <Bell size={22} weight="fill" />,
                run: () => onNavigate('friends'),
            });
        }
        return items.slice(0, 6);
    }, [expenses, pendingFriendRequests, currentUser?.id, onOpenExpense, onNavigate]);

    // Feed cronológico que cruza gastos compartidos, presupuesto y cuentas.
    const feed = useMemo(() => {
        const rows = [];
        expenses.slice(0, 6).forEach((e) => {
            const ts = e.updated_at || e.created_at;
            if (!ts) return;
            const stake = getExpenseStake(e, currentUser?.id);
            rows.push({
                key: `e${e.id}`, ts, title: e.description, icon: <Receipt size={22} weight="duotone" />, tone: 'violet',
                meta: `${e.paid_by_me ? 'Pagaste tú' : `Pagó ${firstNameOf(e.paid_by)}`} · ${relativeDay(ts)}`,
                // Lo que importa de un gasto compartido es TU posición, no el total.
                display: stake.kind === 'owed' ? `+${formatCurrency(stake.amount)}` : stake.kind === 'owe' || stake.kind === 'waiting' ? `−${formatCurrency(stake.amount)}` : formatCurrency(e.amount),
                color: stake.kind === 'owed' ? 'var(--pos)' : stake.kind === 'owe' ? 'var(--neg)' : stake.kind === 'waiting' ? 'var(--info)' : 'var(--ink-3)',
                onClick: () => onOpenExpense(e),
            });
        });
        Object.values(budget?.sections || {}).forEach((bucket) => {
            (bucket.items || []).forEach((item) => {
                if (item.is_pending || item.is_split_synced) return;
                const ts = item.created_at || item.updated_at;
                const amt = numberOrZero(item.actual_amount);
                if (!ts || amt === 0) return;
                const mk = (positive, meta, tone, icon, go) => ({
                    key: `b${item.id}`, ts, title: item.label, icon, tone, meta: `${meta} · ${relativeDay(ts)}`,
                    display: `${positive ? '+' : '−'}${formatCurrency(amt)}`, color: positive ? 'var(--pos)' : 'var(--ink)', onClick: () => onNavigate(go),
                });
                if (item.libreta_entry_id) rows.push(mk(true, 'Abono que te hicieron', 'teal', <HandCoins size={22} weight="duotone" />, 'accounts'));
                else if (item.debt_entry_id) rows.push(mk(false, 'Pago de una deuda', 'coral', <HandCoins size={22} weight="duotone" />, 'accounts'));
                else rows.push(mk(item.section === 'income' || item.section === 'saving', item.section === 'saving' ? 'Ahorro' : 'Presupuesto', item.section === 'income' ? 'teal' : item.section === 'saving' ? 'violet' : 'coral', item.section === 'saving' ? <PiggyBank size={22} weight="duotone" /> : <Money size={22} weight="duotone" />, 'personal'));
            });
        });
        return rows.sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 7);
    }, [expenses, budget, currentUser?.id, onOpenExpense, onNavigate]);

    return (
        <section>
            <ScreenHeader
                kicker="Hola,"
                title={firstNameOf(currentUser)}
                subtitle={today}
                actions={
                    <>
                        <NavAction label="Amigos" badge={pendingFriendRequests.length} onClick={() => onNavigate('friends')}><UsersThree size={22} weight="bold" /></NavAction>
                        <button type="button" onClick={onOpenAccount} aria-label="Tu cuenta" className="rounded-full transition-transform active:scale-90 xl:hidden"><Avatar name={displayNameOf(currentUser)} src={currentUser?.avatar_url} size={44} /></button>
                    </>
                }
            />

            {banner}

            <div className="stagger flex flex-col gap-5">
                <div className="hero p-6">
                    <p className="small">Patrimonio neto</p>
                    <p className="money-xl mt-2"><AnimatedNumber value={netWorth} /></p>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => onNavigate('personal')} className="rounded-[18px] p-3 text-left transition-transform active:scale-[0.97]" style={{ background: 'rgba(255,255,255,0.16)' }}>
                            <span className="flex items-center gap-1.5 tiny" style={{ color: 'rgba(255,255,255,0.8)' }}><Wallet size={14} weight="fill" /> Disponible</span>
                            <span className="money mt-1 block text-[18px]">{formatCurrency(monthlyMargin)}</span>
                        </button>
                        <button type="button" onClick={() => onNavigate('personal')} className="rounded-[18px] p-3 text-left transition-transform active:scale-[0.97]" style={{ background: 'rgba(255,255,255,0.16)' }}>
                            <span className="flex items-center gap-1.5 tiny" style={{ color: 'rgba(255,255,255,0.8)' }}><PiggyBank size={14} weight="fill" /> Ahorros</span>
                            <span className="money mt-1 block text-[18px]">{formatCurrency(savings)}</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => onNavigate('accounts')} className="tile tile-teal p-4 text-left transition-transform active:scale-[0.97]" style={{ boxShadow: '0 16px 28px -16px rgba(20, 167, 196, 0.7)' }}>
                        <span className="bubble h-9 w-9 rounded-full" style={{ background: 'rgba(255,255,255,0.28)' }}><ArrowDownLeft size={18} weight="bold" /></span>
                        <span className="small mt-3 block" style={{ opacity: 0.85 }}>Te deben</span>
                        <span className="money-lg block">{formatCurrency(owedToMe)}</span>
                    </button>
                    <button type="button" onClick={() => onNavigate('expenses')} className="tile tile-coral p-4 text-left transition-transform active:scale-[0.97]" style={{ boxShadow: '0 16px 28px -16px rgba(255, 106, 61, 0.7)' }}>
                        <span className="bubble h-9 w-9 rounded-full" style={{ background: 'rgba(255,255,255,0.28)' }}><ArrowUpRight size={18} weight="bold" /></span>
                        <span className="small mt-3 block" style={{ opacity: 0.85 }}>Debes</span>
                        <span className="money-lg block">{formatCurrency(iOwe)}</span>
                    </button>
                </div>

                {attention.length > 0 && (
                    <div>
                        <h2 className="title mb-3">Requiere tu atención</h2>
                        <div className="snap-x-row scrollbar-hide">
                            {attention.map((a, i) => (
                                <button
                                    key={a.key}
                                    type="button"
                                    onClick={a.run}
                                    className={`${i === 0 ? 'tile tile-violet' : 'card'} flex w-[min(260px,calc(100vw-96px))] flex-col gap-3 p-4 text-left transition-transform active:scale-[0.97]`}
                                    style={i === 0 ? { boxShadow: '0 18px 30px -16px var(--primary-glow)' } : undefined}
                                >
                                    <span className="bubble h-11 w-11 rounded-full" style={i === 0 ? { background: 'rgba(255,255,255,0.22)' } : { background: 'var(--card-tint)', color: 'var(--primary)' }}>{a.icon}</span>
                                    <span>
                                        <span className="heading block">{a.title}</span>
                                        {a.amount && <span className="money-lg mt-1 block">{a.amount}</span>}
                                        <span className="mt-1 block text-[13px] leading-tight" style={{ opacity: 0.8 }}>{a.hint}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="card p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="title">Tu mes</h2>
                        <button type="button" className="btn btn-plain btn-sm" onClick={() => onNavigate('personal')}>Ver más <CaretRight size={14} weight="bold" /></button>
                    </div>
                    {spendingTotal > 0 ? (
                        <div className="flex items-center gap-5">
                            <Donut segments={spending} size={148} thickness={20}>
                                <span className="tiny">Salió</span>
                                <span className="money text-[17px]">{formatCurrency(spendingTotal)}</span>
                            </Donut>
                            <ul className="min-w-0 flex-1 space-y-2.5">
                                {spending.filter((s) => s.value > 0).map((s) => (
                                    <li key={s.label} className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                                        <span className="small min-w-0 flex-1 truncate">{s.label}</span>
                                        <span className="money text-[14px]">{formatCurrency(s.value)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="small">Aún no hay movimientos este mes. Toca el botón + para registrar el primero.</p>
                    )}
                </div>

                <div>
                    <h2 className="title mb-3">Movimientos recientes</h2>
                    {isLoading && feed.length === 0 ? (
                        <div className="card flex justify-center py-10"><CircleNotch size={22} className="animate-spin" style={{ color: 'var(--ink-3)' }} /></div>
                    ) : feed.length === 0 ? (
                        <div className="card px-6 py-8 text-center"><p className="small">Todavía no hay movimientos.</p></div>
                    ) : (
                        <div className="stack">
                            {feed.map((r) => (
                                <button key={r.key} type="button" className="row" onClick={r.onClick}>
                                    <Bubble tone={r.tone}>{r.icon}</Bubble>
                                    <span className="min-w-0 flex-1">
                                        <span className="body block truncate font-semibold">{r.title}</span>
                                        <span className="small block truncate">{r.meta}</span>
                                    </span>
                                    <span className="money" style={{ color: r.color }}>{r.display}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};
