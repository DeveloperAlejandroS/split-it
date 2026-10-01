import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, ChevronRight, Clock, HandCoins, Loader2, PieChart, PiggyBank, Plus, Receipt, Wallet } from 'lucide-react';
import { ScreenHeader, NavAction } from './ui/ScreenHeader';
import { Avatar } from './ui/Avatar';
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

const IconSquare = ({ color, children }) => (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]" style={{ background: color }}>{children}</span>
);

const BreakdownRow = ({ icon, color, label, hint, value, tone, onClick }) => (
    <button type="button" className="ios-row" onClick={onClick}>
        <IconSquare color={color}>{icon}</IconSquare>
        <span className="min-w-0 flex-1">
            <span className="t-body block font-medium">{label}</span>
            {hint && <span className="t-footnote block text-secondary">{hint}</span>}
        </span>
        <span className="t-headline tabular" style={{ color: tone || 'var(--text-primary)' }}>{value}</span>
        <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
    </button>
);

export const HomeView = ({
    currentUser,
    expenses = [],
    pendingFriendRequests = [],
    balance,
    onNavigate,
    onOpenExpense,
    onAdd,
    onOpenAccount,
}) => {
    const [budget, setBudget] = useState(null);
    const [libreta, setLibreta] = useState({ total_pending: 0 });
    const [debts, setDebts] = useState({ total_pending: 0 });
    const [isLoading, setIsLoading] = useState(true);

    const loadAll = useCallback(async () => {
        setIsLoading(true);
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
    /* eslint-enable react-hooks/set-state-in-effect */

    const cash = numberOrZero(budget?.totals?.balance);
    const savings = numberOrZero(budget?.totals?.savings_balance);
    const monthlyMargin = numberOrZero(budget?.totals?.actual_net);
    const splitNet = numberOrZero(balance?.net_balance);
    const libretaPending = numberOrZero(libreta.total_pending);
    const debtPending = numberOrZero(debts.total_pending);

    // Patrimonio neto: todo lo que es tuyo (caja, ahorros, lo que te deben
    // por Split y por Cuentas) menos lo que debes. "Disponible para gastar"
    // se muestra aparte y NUNCA cuenta lo que aún no te han pagado.
    const receivable = splitNet + libretaPending;
    const netWorth = cash + savings + receivable - debtPending;

    const today = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
    const subtitle = `Hola, ${firstNameOf(currentUser)} · ${today}`;

    // Cosas que esperan una acción tuya, ordenadas por urgencia.
    const attention = useMemo(() => {
        const items = [];
        expenses.forEach((expense) => {
            (expense.participants || []).forEach((p) => {
                if (expense.paid_by_me && getParticipantStatus(p) === 'awaiting_confirmation') {
                    items.push({
                        key: `c-${expense.id}-${p.user_id}`,
                        who: displayNameOf(p),
                        title: `${displayNameOf(p)} dice que te pagó ${formatCurrency(p.pending_claim_amount)}`,
                        hint: `${expense.description} · confírmalo`,
                        color: '#34c759',
                        icon: <Clock size={19} color="#fff" />,
                        run: () => onOpenExpense(expense),
                    });
                }
            });
            if (!expense.paid_by_me) {
                const stake = getExpenseStake(expense, currentUser?.id);
                if (stake.kind === 'owe') {
                    items.push({
                        key: `o-${expense.id}`,
                        who: displayNameOf(expense.paid_by),
                        title: `Debes ${formatCurrency(stake.amount)} a ${displayNameOf(expense.paid_by)}`,
                        hint: expense.description,
                        color: '#ff3b30',
                        icon: <Receipt size={19} color="#fff" />,
                        run: () => onOpenExpense(expense),
                    });
                }
            }
        });
        if (pendingFriendRequests.length > 0) {
            items.unshift({
                key: 'fr',
                title: `${pendingFriendRequests.length} ${pendingFriendRequests.length === 1 ? 'solicitud de amistad' : 'solicitudes de amistad'}`,
                hint: 'Acéptalas para dividir gastos',
                color: '#0a84ff',
                icon: <Bell size={19} color="#fff" />,
                run: () => onNavigate('friends'),
            });
        }
        return items.slice(0, 5);
    }, [expenses, pendingFriendRequests, currentUser?.id, onOpenExpense, onNavigate]);

    // Feed cronológico que cruza gastos compartidos, presupuesto y cuentas.
    const feed = useMemo(() => {
        const rows = [];
        expenses.slice(0, 6).forEach((e) => {
            const ts = e.updated_at || e.created_at;
            if (!ts) return;
            const stake = getExpenseStake(e, currentUser?.id);
            rows.push({
                key: `e${e.id}`, ts, title: e.description,
                meta: `${e.paid_by_me ? 'Pagaste tú' : `Pagó ${displayNameOf(e.paid_by)}`} · ${relativeDay(ts)}`,
                tag: 'Gastos', color: '#af52de', onClick: () => onOpenExpense(e),
                // Lo que importa de un gasto compartido es TU posición, no el total.
                display: stake.kind === 'owed' ? `+${formatCurrency(stake.amount)}` : stake.kind === 'owe' || stake.kind === 'waiting' ? `−${formatCurrency(stake.amount)}` : formatCurrency(e.amount),
                tone: stake.kind === 'owed' ? 'var(--success)' : stake.kind === 'owe' ? 'var(--danger)' : stake.kind === 'waiting' ? 'var(--info)' : 'var(--text-muted)',
            });
        });
        Object.values(budget?.sections || {}).forEach((bucket) => {
            (bucket.items || []).forEach((item) => {
                if (item.is_pending || item.is_split_synced) return;
                const ts = item.created_at || item.updated_at;
                const amt = numberOrZero(item.actual_amount);
                if (!ts || amt === 0) return;
                const base = { key: `b${item.id}`, ts, title: item.label, amount: amt };
                const out = (r) => ({ ...r, display: `${r.positive ? '+' : '−'}${formatCurrency(amt)}`, tone: r.positive ? 'var(--success)' : 'var(--text-primary)' });
                if (item.libreta_entry_id) rows.push(out({ ...base, meta: `Me deben · ${relativeDay(ts)}`, tag: 'Cuentas', positive: true, color: '#0a84ff', onClick: () => onNavigate('accounts') }));
                else if (item.debt_entry_id) rows.push(out({ ...base, meta: `Debo · ${relativeDay(ts)}`, tag: 'Cuentas', positive: false, color: '#ff9500', onClick: () => onNavigate('accounts') }));
                else rows.push(out({ ...base, meta: `Presupuesto · ${relativeDay(ts)}`, tag: 'Presupuesto', positive: item.section === 'income' || item.section === 'saving', color: '#34c759', onClick: () => onNavigate('personal') }));
            });
        });
        return rows.sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 7);
    }, [expenses, budget, currentUser?.id, onOpenExpense, onNavigate]);

    return (
        <section className="animate-fade-up">
            <ScreenHeader
                title="Inicio"
                subtitle={subtitle}
                leading={
                    <button type="button" onClick={onOpenAccount} aria-label="Cuenta" className="rounded-full transition-transform active:scale-95 xl:hidden">
                        <Avatar name={displayNameOf(currentUser)} size={34} />
                    </button>
                }
                actions={<NavAction label="Agregar" tint onClick={onAdd}><Plus size={20} strokeWidth={2.4} /></NavAction>}
            />

            <div className="ios-card p-5">
                <p className="t-footnote text-secondary">Patrimonio neto</p>
                <p className="t-money-xl mt-1" style={{ color: netWorth >= 0 ? 'var(--text-primary)' : 'var(--danger)' }}>
                    <AnimatedNumber value={netWorth} />
                </p>
                <p className="t-subhead mt-2 text-secondary">Todo lo tuyo menos lo que debes. Lo que aún no te pagan cuenta aquí, pero no como dinero disponible.</p>
            </div>

            <p className="t-section px-4 pb-2 pt-6">De qué se compone</p>
            <div className="ios-group">
                <BreakdownRow icon={<Wallet size={19} color="#fff" />} color="#34c759" label="Caja" hint="Tu saldo este mes" value={formatCurrency(cash)} onClick={() => onNavigate('personal')} />
                <BreakdownRow icon={<PiggyBank size={19} color="#fff" />} color="#ff9f0a" label="Ahorros" hint="Con meta, no es para gastar" value={formatCurrency(savings)} onClick={() => onNavigate('personal')} />
                <BreakdownRow icon={<HandCoins size={19} color="#fff" />} color="#0a84ff" label="Te deben" hint="Gastos compartidos y préstamos" value={formatCurrency(receivable)} tone={receivable >= 0 ? 'var(--success)' : 'var(--danger)'} onClick={() => onNavigate(libretaPending > Math.abs(splitNet) ? 'accounts' : 'expenses')} />
                <BreakdownRow icon={<Receipt size={19} color="#fff" />} color="#ff3b30" label="Debes" hint="Tus deudas registradas" value={formatCurrency(debtPending)} tone={debtPending > 0 ? 'var(--danger)' : undefined} onClick={() => onNavigate('accounts')} />
            </div>

            <button type="button" onClick={() => onNavigate('personal')} className="ios-card mt-4 flex w-full items-center gap-3 p-4 text-left transition-transform active:scale-[0.99]">
                <IconSquare color="#af52de"><PieChart size={19} color="#fff" /></IconSquare>
                <span className="min-w-0 flex-1">
                    <span className="t-footnote block text-secondary">Disponible para gastar este mes</span>
                    <span className="t-money-lg block" style={{ color: monthlyMargin >= 0 ? 'var(--text-primary)' : 'var(--danger)' }}>{formatCurrency(monthlyMargin)}</span>
                </span>
                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
            </button>

            {attention.length > 0 && (
                <>
                    <p className="t-section px-4 pb-2 pt-6">Requiere tu atención</p>
                    <div className="ios-group">
                        {attention.map((a) => (
                            <button key={a.key} type="button" className="ios-row" onClick={a.run}>
                                <IconSquare color={a.color}>{a.icon}</IconSquare>
                                <span className="min-w-0 flex-1">
                                    <span className="t-body block font-medium">{a.title}</span>
                                    <span className="t-footnote block truncate text-secondary">{a.hint}</span>
                                </span>
                                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                            </button>
                        ))}
                    </div>
                </>
            )}

            <p className="t-section px-4 pb-2 pt-6">Movimientos recientes</p>
            {isLoading && feed.length === 0 ? (
                <div className="ios-card flex justify-center py-10"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} /></div>
            ) : feed.length === 0 ? (
                <div className="ios-card px-6 py-10 text-center">
                    <p className="t-subhead text-secondary">Todavía no hay movimientos. Toca + para registrar un gasto, un ingreso o una deuda.</p>
                </div>
            ) : (
                <div className="ios-group">
                    {feed.map((r) => (
                        <button key={r.key} type="button" className="ios-row" onClick={r.onClick}>
                            <IconSquare color={r.color}><span className="text-[11px] font-bold text-white">{r.tag.slice(0, 1)}</span></IconSquare>
                            <span className="min-w-0 flex-1">
                                <span className="t-body block truncate font-medium">{r.title}</span>
                                <span className="t-footnote block truncate text-secondary">{r.meta}</span>
                            </span>
                            <span className="t-headline tabular" style={{ color: r.tone }}>{r.display}</span>
                        </button>
                    ))}
                </div>
            )}
        </section>
    );
};
