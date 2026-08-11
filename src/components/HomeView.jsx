import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ArrowRight,
    LayoutGrid,
    Loader2,
    NotebookText,
    PiggyBank,
    RefreshCw,
    Repeat2,
    Users,
    Wallet,
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { AnimatedNumber } from './AnimatedNumber';
import { formatCurrency, numberOrZero } from '../utils/helpers';
import { getCurrentMonthKey } from '../utils/budgetHelpers';
import { API_URL } from '../config/api';

const TOKEN_KEY = 'splitit_jwt';

// Inicio: la pantalla que faltaba. Antes, "ver todo junto" significaba
// visitar 4 pantallas y sumar a mano. Acá el patrimonio neto, las
// secciones y un feed cronológico real (mezclando gastos compartidos,
// movimientos del presupuesto y abonos de Cuentas) viven en un solo lugar.
// Usa el mismo lenguaje visual glass + marca morado/fucsia que el resto de
// la app -- no tiene identidad propia (eso fue una primera versión, mal:
// toda la app tiene que ser coherente con un solo lenguaje de diseño).

const relativeTime = (isoDate) => {
    if (!isoDate) return '';
    const then = new Date(isoDate).getTime();
    if (!Number.isFinite(then)) return '';
    const diffMs = Date.now() - then;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'ahora mismo';
    if (diffMin < 60) return `hace ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `hace ${diffH} h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return 'ayer';
    if (diffD < 7) return `hace ${diffD} días`;
    return new Date(isoDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
};

const getPayerName = (paidBy) => {
    if (!paidBy || typeof paidBy !== 'object') return 'Alguien';
    const parts = [paidBy.first_name, paidBy.last_name].filter(Boolean);
    return parts.join(' ') || paidBy.username || paidBy.email || 'Alguien';
};

const DomainCard = ({ icon, label, figure, note, tint, onClick, theme }) => (
    <button type="button" onClick={onClick} className="text-left w-full">
        <GlassCard theme={theme} className="p-5 h-full transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-4">
                <span
                    className="h-9 w-9 rounded-xl flex items-center justify-center"
                    style={{ background: tint.soft, color: tint.solid }}
                >
                    {icon}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{label}</span>
            </div>
            <p className="tabular text-xl font-black text-primary">{figure}</p>
            <p className="text-[11px] text-muted mt-1.5 leading-snug">{note}</p>
        </GlassCard>
    </button>
);

const FeedRow = ({ title, meta, tag, tint, amount, isPositive }) => (
    <div className="grid items-center gap-4 px-5 py-3.5 border-b border-white/5 last:border-0">
        <div className="grid grid-cols-[30px_1fr_auto_auto] items-center gap-4">
            <span className="h-[30px] w-[30px] rounded-[9px] flex items-center justify-center" style={{ background: tint.soft, color: tint.solid }}>
                <Repeat2 size={13} />
            </span>
            <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-primary truncate">{title}</p>
                <p className="text-[11.5px] text-muted">{meta}</p>
            </div>
            <span
                className="text-[10px] font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full whitespace-nowrap"
                style={{ background: tint.soft, color: tint.solid }}
            >
                {tag}
            </span>
            <span
                className="tabular text-sm font-semibold text-right whitespace-nowrap"
                style={{ color: isPositive ? 'var(--success)' : 'var(--danger)' }}
            >
                {isPositive ? '+' : '−'}{formatCurrency(Math.abs(amount))}
            </span>
        </div>
    </div>
);

export const HomeView = ({
    theme = 'dark',
    currentUser,
    expenses = [],
    friends = [],
    pendingFriendRequests = [],
    balance,
    onOpenSplit,
    onOpenBudget,
    onOpenAccounts,
    onOpenFriends,
}) => {
    const [budget, setBudget] = useState(null);
    const [libreta, setLibreta] = useState({ total_pending: 0 });
    const [debts, setDebts] = useState({ entries: [], total_pending: 0 });
    const [isLoading, setIsLoading] = useState(true);

    const loadAll = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem(TOKEN_KEY);
            const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
            const monthKey = getCurrentMonthKey();
            const [budgetRes, libretaRes, debtsRes] = await Promise.all([
                fetch(`${API_URL}/budget/${monthKey}`, { headers }),
                fetch(`${API_URL}/libreta`, { headers }),
                fetch(`${API_URL}/debts`, { headers }),
            ]);
            const [budgetJson, libretaJson, debtsJson] = await Promise.all([
                budgetRes.json(),
                libretaRes.json(),
                debtsRes.json(),
            ]);
            if (budgetRes.ok) setBudget(budgetJson);
            if (libretaRes.ok) setLibreta(libretaJson);
            if (debtsRes.ok) setDebts(debtsJson);
        } catch {
            // Silencioso: Inicio es un resumen -- si una fuente falla, las
            // demás cards igual se pintan con lo que sí llegó.
        } finally {
            setIsLoading(false);
        }
    }, []);

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        loadAll();
    }, [loadAll]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const libretaPending = numberOrZero(libreta.total_pending);
    const debtPending = numberOrZero(debts.total_pending);
    const cash = numberOrZero(budget?.totals?.balance);
    const savings = numberOrZero(budget?.totals?.savings_balance);
    // "Disponible para gastar este mes" NO es `balance` (ese ya incluye
    // Ahorros/Deudas de vuelta) -- es el margen puro (Ingresos - Gastos
    // Fijos - Gastos), `actual_net`. Ahorros tiene su propia card: es plata
    // que separaste con una meta, no plata con la que podés contar para
    // gastos del mes sin arruinar esa meta.
    const monthlyMargin = numberOrZero(budget?.totals?.actual_net);
    const netBalance = numberOrZero(balance?.net_balance);
    // Patrimonio neto SÍ suma lo que te deben (Libreta + Split) como activo
    // -- es plata que ya es tuya, aunque no esté en la mano. "Disponible"
    // (arriba) nunca la suma: mientras no se confirme, no es caja.
    const netWorth = cash + savings + libretaPending + netBalance - debtPending;
    const cuentasNet = libretaPending - debtPending;
    const requestsCount = pendingFriendRequests.length;

    const greetingName = (() => {
        const first = String(currentUser?.first_name || '').trim();
        return first || String(currentUser?.username || currentUser?.email || '').split('@')[0] || 'ahí';
    })();

    const todayLabel = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

    // Feed de movimientos: cruza 3 fuentes que hoy viven en pantallas
    // separadas -- gastos compartidos recientes, movimientos manuales del
    // presupuesto, y abonos de Cuentas (que ya llegan como budget_items con
    // libreta_entry_id/debt_entry_id) -- y los ordena por fecha real. Esta
    // es la interconexión de verdad: un timeline, no solo un número
    // compartido entre pantallas.
    const feed = useMemo(() => {
        const items = [];

        expenses.slice(0, 6).forEach((expense) => {
            const ts = expense.updated_at || expense.created_at;
            if (!ts) return;
            items.push({
                key: `exp-${expense.id}`,
                ts,
                title: expense.description || 'Gasto compartido',
                meta: `Compartido · pagó ${getPayerName(expense.paid_by)} · ${relativeTime(ts)}`,
                tag: 'Split',
                tint: { soft: 'var(--info-soft)', solid: 'var(--info)' },
                amount: numberOrZero(expense.amount),
                isPositive: Boolean(expense.paid_by_me),
            });
        });

        const sections = budget?.sections;
        if (sections) {
            Object.values(sections).forEach((bucket) => {
                (bucket.items || []).forEach((item) => {
                    if (item.is_pending || item.is_split_synced) return;
                    const ts = item.created_at || item.updated_at;
                    if (!ts || numberOrZero(item.actual_amount) === 0) return;

                    if (item.libreta_entry_id) {
                        items.push({
                            key: `bi-${item.id}`,
                            ts,
                            title: item.label,
                            meta: `Cuentas · me deben · ${relativeTime(ts)}`,
                            tag: 'Me deben',
                            tint: { soft: 'var(--success-soft)', solid: 'var(--success)' },
                            amount: numberOrZero(item.actual_amount),
                            isPositive: true,
                        });
                    } else if (item.debt_entry_id) {
                        items.push({
                            key: `bi-${item.id}`,
                            ts,
                            title: item.label,
                            meta: `Cuentas · debo · ${relativeTime(ts)}`,
                            tag: 'Debo',
                            tint: { soft: 'var(--danger-soft)', solid: 'var(--danger)' },
                            amount: numberOrZero(item.actual_amount),
                            isPositive: false,
                        });
                    } else {
                        const isIncomeLike = item.section === 'income' || item.section === 'saving';
                        items.push({
                            key: `bi-${item.id}`,
                            ts,
                            title: item.label,
                            meta: `Presupuesto · ${relativeTime(ts)}`,
                            tag: 'Presupuesto',
                            tint: { soft: 'var(--accent-soft)', solid: 'var(--accent)' },
                            amount: numberOrZero(item.actual_amount),
                            isPositive: isIncomeLike,
                        });
                    }
                });
            });
        }

        return items
            .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
            .slice(0, 7);
    }, [expenses, budget]);

    return (
        <section className="space-y-5">
            <div className="flex items-start justify-between gap-4 px-2">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-muted capitalize">{todayLabel}</p>
                    <h2 className="mt-1 text-2xl font-black text-primary tracking-tight">Hola, {greetingName}</h2>
                </div>
                <button
                    type="button"
                    onClick={loadAll}
                    disabled={isLoading}
                    className="p-2.5 rounded-full transition-all disabled:opacity-50 shrink-0"
                    style={{ background: 'var(--surface-soft)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}
                    aria-label="Refrescar"
                >
                    {isLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                </button>
            </div>

            {/* Hero: patrimonio neto -- el número que amarra todo */}
            <GlassCard theme={theme} className="p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-1">
                    <Wallet size={14} className="text-(--accent)" />
                    <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-muted">Patrimonio neto</p>
                </div>
                <p
                    className="tabular font-black mt-2 text-[38px] sm:text-[46px] leading-none"
                    style={{ color: netWorth >= 0 ? 'var(--success)' : 'var(--danger)' }}
                >
                    <AnimatedNumber value={netWorth} />
                </p>
                <p className="text-[12.5px] text-muted mt-3 leading-snug">
                    Caja + Ahorros + te deben (Split + Libreta) − debes. Como activo, no como caja disponible: mientras no se confirme, es riesgo, no efectivo.
                </p>
            </GlassCard>

            {/* Dominios: cada sección con su cifra clave, un click de distancia */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                <DomainCard
                    theme={theme}
                    icon={<LayoutGrid size={16} />}
                    label="Compartido"
                    figure={<>{netBalance >= 0 ? '+' : '−'}{formatCurrency(Math.abs(netBalance))}</>}
                    note={netBalance >= 0 ? 'Te deben en total' : 'Debes en total'}
                    tint={{ soft: 'var(--info-soft)', solid: 'var(--info)' }}
                    onClick={onOpenSplit}
                />
                <DomainCard
                    theme={theme}
                    icon={<Wallet size={16} />}
                    label="Presupuesto"
                    figure={formatCurrency(monthlyMargin)}
                    note="Disponible para gastar este mes"
                    tint={{ soft: 'var(--accent-soft)', solid: 'var(--accent)' }}
                    onClick={onOpenBudget}
                />
                <DomainCard
                    theme={theme}
                    icon={<PiggyBank size={16} />}
                    label="Ahorros"
                    figure={formatCurrency(savings)}
                    note="Aparte -- tiene meta, no es para gastar"
                    tint={{ soft: 'var(--success-soft)', solid: 'var(--success)' }}
                    onClick={onOpenBudget}
                />
                <DomainCard
                    theme={theme}
                    icon={<NotebookText size={16} />}
                    label="Cuentas"
                    figure={<>{cuentasNet >= 0 ? '+' : '−'}{formatCurrency(Math.abs(cuentasNet))}</>}
                    note={`Te deben ${formatCurrency(libretaPending)} · debes ${formatCurrency(debtPending)}`}
                    tint={{ soft: 'var(--warning-soft)', solid: 'var(--warning)' }}
                    onClick={onOpenAccounts}
                />
                <DomainCard
                    theme={theme}
                    icon={<Users size={16} />}
                    label="Amigos"
                    figure={friends.length}
                    note={requestsCount > 0 ? `${requestsCount} solicitud${requestsCount !== 1 ? 'es' : ''} pendiente${requestsCount !== 1 ? 's' : ''}` : 'Contactos activos'}
                    tint={{ soft: 'var(--brand-soft)', solid: 'var(--brand)' }}
                    onClick={onOpenFriends}
                />
            </div>

            {/* Feed: la interconexión real -- todo lo reciente, de todas las secciones, en orden */}
            <div>
                <h3 className="text-lg font-bold text-primary mb-3 px-2">Movimientos recientes</h3>
                <GlassCard theme={theme} className="overflow-hidden">
                    {isLoading && feed.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={18} className="animate-spin text-muted" />
                        </div>
                    ) : feed.length === 0 ? (
                        <div className="py-12 px-5 text-center">
                            <p className="text-sm text-muted">
                                Todavía no hay movimientos este mes. Empieza registrando un gasto o cargando tu presupuesto.
                            </p>
                        </div>
                    ) : (
                        feed.map((row) => (
                            <FeedRow
                                key={row.key}
                                title={row.title}
                                meta={row.meta}
                                tag={row.tag}
                                tint={row.tint}
                                amount={row.amount}
                                isPositive={row.isPositive}
                            />
                        ))
                    )}
                </GlassCard>
            </div>

            <button
                type="button"
                onClick={onOpenBudget}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-[13px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))', boxShadow: '0 12px 28px -14px rgba(232, 24, 156, 0.55)' }}
            >
                Ver Presupuesto del mes <ArrowRight size={14} />
            </button>
        </section>
    );
};
