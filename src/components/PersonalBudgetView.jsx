import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight, Loader2, Pencil, PiggyBank, RefreshCw } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { BudgetSectionPanel } from './BudgetSectionPanel';
import { AnimatedNumber } from './AnimatedNumber';
import { formatCurrency, numberOrZero } from '../utils/helpers';
import { getCurrentMonthKey, monthKeyToLabel, shiftMonthKey } from '../utils/budgetHelpers';
import { API_URL } from '../config/api';

const TOKEN_KEY = 'splitit_jwt';

// Barrita horizontal de un renglón del mini-gráfico de salud financiera —
// el largo es proporcional al mayor de los 4 montos, así siempre hay al
// menos una barra llena y las demás se leen relativas a esa.
const HealthBar = ({ label, amount, max, color }) => {
    const pct = max > 0 ? Math.max(2, Math.round((amount / max) * 100)) : 0;
    return (
        <div>
            <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-secondary">{label}</span>
                <span className="text-primary font-semibold tabular">{formatCurrency(amount)}</span>
            </div>
            <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
            </div>
        </div>
    );
};

// Botón + menú contextual flotante con un vistazo rápido a la "salud
// financiera" del mes: de dónde sale la plata, hacia dónde se va, y qué
// tan sano es el ritmo de ahorro — sin tener que sumar las 5 secciones a
// mano para entenderlo.
const FinancialHealthButton = ({ totals, sections, theme }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return undefined;
        const handleClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
        };
        const handleKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [isOpen]);

    const income = numberOrZero(sections.income.actual_total);
    const outflow = numberOrZero(sections.fixed_expense.actual_total) + numberOrZero(sections.tracked_expense.actual_total);
    const saving = numberOrZero(sections.saving.actual_total);
    const debt = numberOrZero(sections.debt.actual_total);
    const max = Math.max(income, outflow, saving, debt, 1);
    const savingsRate = income > 0 ? (saving / income) * 100 : null;

    let verdict = 'Todavía no hay ingresos cargados este mes para calcular un ritmo de ahorro.';
    let verdictColor = 'var(--text-muted)';
    if (income > 0) {
        if (outflow > income) {
            verdict = 'Estás gastando más de lo que entra este mes.';
            verdictColor = 'var(--danger)';
        } else if (savingsRate >= 20) {
            verdict = `Buen ritmo: estás ahorrando ${savingsRate.toFixed(0)}% de tus ingresos.`;
            verdictColor = 'var(--success)';
        } else if (savingsRate > 0) {
            verdict = `Estás ahorrando ${savingsRate.toFixed(0)}% de tus ingresos — se puede apretar un poco más.`;
            verdictColor = 'var(--warning)';
        } else {
            verdict = 'Estás cubriendo gastos, pero no separaste nada para ahorro este mes.';
            verdictColor = 'var(--warning)';
        }
    }

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                aria-label="Ver salud financiera del mes"
                title="Salud financiera"
            >
                <Activity size={14} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-10 z-30 w-72 animate-in fade-in zoom-in-95 duration-150">
                    <GlassCard theme={theme} className="p-4 border border-white/10 shadow-2xl">
                        <p className="text-xs font-bold text-primary mb-3">Salud financiera del mes</p>
                        <div className="space-y-2.5">
                            <HealthBar label="Ingreso" amount={income} max={max} color="var(--success)" />
                            <HealthBar label="Gastos (fijos + variables)" amount={outflow} max={max} color="var(--danger)" />
                            <HealthBar label="Ahorro" amount={saving} max={max} color="var(--info)" />
                            <HealthBar label="Pagos a deudas" amount={debt} max={max} color="var(--warning)" />
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-[11px] leading-snug" style={{ color: verdictColor }}>{verdict}</p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[10px]">
                            <span className="text-muted">Balance del mes</span>
                            <span className="font-bold tabular" style={{ color: totals.balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                {formatCurrency(totals.balance)}
                            </span>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
};

const HeroStat = ({ label, hint, budgeted, actual, theme }) => (
    <GlassCard className="p-5 flex-1 min-w-48" theme={theme}>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted mb-1">{label}</p>
        <p className="text-[11px] text-muted mb-2 leading-snug">{hint}</p>
        <p className="text-2xl font-black tabular text-primary">
            <AnimatedNumber value={actual} />
        </p>
        <p className="text-xs text-muted mt-1 tabular">Presupuestado: {formatCurrency(budgeted)}</p>
    </GlassCard>
);

// Una línea de la fórmula de Flujo de Caja, calcada del Excel: cada renglón
// muestra su signo real (+/−) en vez de dejar que el usuario adivine si
// suma o resta.
const FormulaLine = ({ label, amount, sign }) => (
    <div className="flex items-center justify-between py-1.5 text-sm">
        <span className="text-secondary">
            <span className="text-muted mr-1.5 tabular">{sign}</span>
            {label}
        </span>
        <span className="text-primary font-semibold tabular">
            <AnimatedNumber value={amount} />
        </span>
    </div>
);

// Input inline para corregir un saldo inicial (saldo de banco, ahorros ya
// juntados, o deuda total pendiente). Sin esto, "Balance Deudas pendiente"
// nunca tiene de dónde arrancar: si nunca sembrás cuánto debés hoy, el
// número solo se va poniendo negativo con cada pago en vez de acercarse a
// cero — este control es lo que lo arregla.
const OpeningBalanceField = ({ label, hint, value, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(String(value));
    const [isSaving, setIsSaving] = useState(false);

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isEditing) setDraft(String(value));
    }, [value, isEditing]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const handleSave = async () => {
        const n = Number(draft);
        if (!Number.isFinite(n)) {
            setDraft(String(value));
            setIsEditing(false);
            return;
        }
        setIsSaving(true);
        await onSave(n);
        setIsSaving(false);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div>
                <p className="text-muted text-xs mb-1">{label}</p>
                <div className="flex items-center gap-1.5">
                    <input
                        type="number"
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave();
                            if (e.key === 'Escape') { setDraft(String(value)); setIsEditing(false); }
                        }}
                        onBlur={handleSave}
                        disabled={isSaving}
                        className="w-full bg-white/5 rounded-lg px-2 py-1 text-sm text-primary outline-none border border-(--accent)/40 tabular"
                    />
                </div>
            </div>
        );
    }

    return (
        <button type="button" onClick={() => setIsEditing(true)} className="text-left group w-full" title={hint}>
            <p className="text-muted text-xs mb-0.5 flex items-center gap-1">
                {label}
                <Pencil size={9} className="opacity-0 group-hover:opacity-70 transition-opacity" />
            </p>
            <p className="font-semibold text-primary tabular">{formatCurrency(value)}</p>
        </button>
    );
};

export const PersonalBudgetView = ({ onViewSyncedExpense, theme = 'dark' }) => {
    const [monthKey, setMonthKey] = useState(() => getCurrentMonthKey());
    const [navDirection, setNavDirection] = useState('forward');
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchMonth = useCallback(async (key) => {
        setIsLoading(true);
        setError('');
        try {
            const token = localStorage.getItem(TOKEN_KEY);
            const response = await fetch(`${API_URL}/budget/${key}`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            const json = await response.json();
            if (!response.ok) throw new Error(json.message || `Error ${response.status}`);
            setData(json);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Carga el mes cada vez que cambia (montaje inicial o navegación ←/→).
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        fetchMonth(monthKey);
    }, [monthKey, fetchMonth]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const performItemAction = useCallback(
        async (url, method, body) => {
            try {
                const token = localStorage.getItem(TOKEN_KEY);
                const response = await fetch(`${API_URL}${url}`, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                    },
                    ...(body ? { body: JSON.stringify(body) } : {}),
                });
                const json = await response.json();
                if (!response.ok) throw new Error(json.message || `Error ${response.status}`);
                await fetchMonth(monthKey);
                return true;
            } catch (err) {
                setError(err.message);
                setTimeout(() => setError(''), 5000);
                return false;
            }
        },
        [monthKey, fetchMonth],
    );

    const handleAddItem = useCallback(
        (payload) => performItemAction(`/budget/${monthKey}/items`, 'POST', payload),
        [performItemAction, monthKey],
    );
    const handleUpdateItem = useCallback(
        (itemId, patch) => performItemAction(`/budget/items/${itemId}`, 'PATCH', patch),
        [performItemAction],
    );
    const handleDeleteItem = useCallback(
        (itemId) => performItemAction(`/budget/items/${itemId}`, 'DELETE'),
        [performItemAction],
    );
    const handleContributeItem = useCallback(
        (itemId, amount) => performItemAction(`/budget/items/${itemId}/contribute`, 'PATCH', { amount }),
        [performItemAction],
    );
    const handleUpdateOpening = useCallback(
        (patch) => performItemAction(`/budget/${monthKey}/opening`, 'PATCH', patch),
        [performItemAction, monthKey],
    );

    const goToMonth = (delta) => {
        setNavDirection(delta > 0 ? 'forward' : 'back');
        setMonthKey((k) => shiftMonthKey(k, delta));
    };

    if (!data && isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 size={24} className="animate-spin text-(--accent)" />
            </div>
        );
    }

    if (!data) return null;

    const { sections, totals, opening } = data;
    const monthAnimClass = navDirection === 'forward' ? 'animate-month-in-forward' : 'animate-month-in-back';

    const renderSection = (section, splitSync, compact = false) => (
        <BudgetSectionPanel
            section={section}
            items={sections[section].items}
            splitSyncItems={splitSync ? sections[section].items.filter((i) => i.is_split_synced) : []}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onContributeItem={handleContributeItem}
            onViewSyncedExpense={splitSync ? onViewSyncedExpense : undefined}
            openingCash={section === 'income' ? opening.cash_balance : undefined}
            savingsItems={
                section === 'fixed_expense' || section === 'tracked_expense'
                    ? sections.saving.items.filter((i) => !i.is_split_synced)
                    : undefined
            }
            compact={compact}
            theme={theme}
        />
    );

    return (
        <section className="space-y-5">
            {/* Month nav + header */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <div
                        className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                    >
                        <PiggyBank size={16} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-primary leading-tight">Gastos personales</h3>
                        <p className="text-xs text-muted">
                            En cada fila: <span className="text-secondary font-medium">Presupuestado</span> es lo que planeaste, <span className="text-secondary font-medium">Actual</span> es lo que realmente pasó.
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => fetchMonth(monthKey)}
                    disabled={isLoading}
                    className="p-2 rounded-full transition-all disabled:opacity-50"
                    style={{ background: 'var(--surface-soft)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}
                    aria-label="Refrescar"
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>

            {error && (
                <div
                    className="p-3 rounded-2xl text-sm text-primary animate-row-in"
                    style={{ background: 'var(--danger-soft)', border: '1px solid rgba(232,99,122,0.25)' }}
                >
                    {error}
                </div>
            )}

            <GlassCard className="p-3 flex items-center justify-between" theme={theme}>
                <button
                    type="button"
                    onClick={() => goToMonth(-1)}
                    className="h-9 w-9 rounded-full flex items-center justify-center text-secondary hover:bg-white/5 hover:text-primary transition-all active:scale-90"
                    aria-label="Mes anterior"
                >
                    <ChevronLeft size={18} />
                </button>
                <span key={monthKey} className={`text-sm font-bold text-primary ${monthAnimClass}`}>
                    {monthKeyToLabel(monthKey)}
                </span>
                <button
                    type="button"
                    onClick={() => goToMonth(1)}
                    className="h-9 w-9 rounded-full flex items-center justify-center text-secondary hover:bg-white/5 hover:text-primary transition-all active:scale-90"
                    aria-label="Mes siguiente"
                >
                    <ChevronRight size={18} />
                </button>
            </GlassCard>

            <div key={`${monthKey}-content`} className={`space-y-4 ${monthAnimClass}`}>
                {/* Fila superior: presupuestado/saldo semanal a la izquierda,
                    flujo de caja a la derecha — son los dos "resúmenes" del
                    mes, tiene sentido verlos juntos antes de bajar al detalle
                    fila por fila de cada sección. */}
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] items-start">
                    <div className="flex flex-col gap-3 h-full">
                        <HeroStat
                            label="Presupuestado"
                            hint="Lo que te queda de Ingresos menos Gastos Fijos y Gastos, antes de Ahorros/Deudas."
                            budgeted={totals.budgeted_net}
                            actual={totals.actual_net}
                            theme={theme}
                        />
                        <HeroStat
                            label="Saldo semanal"
                            hint="El presupuestado repartido en 4 semanas, para saber cuánto gastar por semana."
                            budgeted={totals.weekly_budgeted}
                            actual={totals.weekly_actual}
                            theme={theme}
                        />
                    </div>

                    {/* Flujo de caja: la misma fórmula del Excel, desglosada línea por línea
                        para que se entienda de dónde sale el Balance final, en vez de
                        mostrar solo el número. */}
                    <GlassCard className="p-5" theme={theme}>
                        <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-bold text-primary">Flujo de Caja</h4>
                            <FinancialHealthButton totals={totals} sections={sections} theme={theme} />
                        </div>
                        <p className="text-[11px] text-muted mb-3 leading-snug">
                            Cómo se arma el balance final del mes, paso a paso.
                        </p>

                        <div className="mb-2 pb-2 border-b border-white/5">
                            <OpeningBalanceField
                                label="+ Saldo anterior (banco/efectivo)"
                                hint="Corregí este número si no coincide con lo que realmente tenés — es el punto de partida de todo el cálculo"
                                value={opening.cash_balance}
                                onSave={(n) => handleUpdateOpening({ cash_balance: n })}
                            />
                        </div>

                        <div className="divide-y divide-white/5">
                            <FormulaLine label="Ingreso" amount={sections.income.actual_total} sign="+" />
                            <FormulaLine label="Gastos Fijos" amount={sections.fixed_expense.actual_total} sign="−" />
                            <FormulaLine label="Gastos" amount={sections.tracked_expense.actual_total} sign="−" />
                            <FormulaLine label="Ahorros" amount={sections.saving.actual_total} sign="+" />
                            <FormulaLine label="Deudas" amount={sections.debt.actual_total} sign="−" />
                        </div>

                        <div className="pt-3 mt-1 border-t border-white/10 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Balance</span>
                            <span
                                className="text-2xl font-black tabular"
                                style={{ color: totals.balance >= 0 ? 'var(--success)' : 'var(--danger)' }}
                            >
                                <AnimatedNumber value={totals.balance} />
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs mt-4 pt-4 border-t border-white/10">
                            <OpeningBalanceField
                                label="Ahorros ya juntados (saldo inicial)"
                                hint="Lo que ya tenías ahorrado antes de este mes"
                                value={opening.savings_balance}
                                onSave={(n) => handleUpdateOpening({ savings_balance: n })}
                            />
                            <OpeningBalanceField
                                label="Deuda total pendiente (saldo inicial)"
                                hint="Cuánto debés hoy en total, antes de los pagos de este mes — sin esto, el balance de deudas no tiene de dónde arrancar"
                                value={opening.debt_balance}
                                onSave={(n) => handleUpdateOpening({ debt_balance: n })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs mt-3 pt-3 border-t border-white/10">
                            <div>
                                <p className="text-muted">Balance Ahorros acumulado</p>
                                <p className="font-semibold text-(--success) tabular mt-0.5">
                                    <AnimatedNumber value={totals.savings_balance} />
                                </p>
                            </div>
                            <div>
                                <p className="text-muted">Balance Deudas pendiente</p>
                                <p className="font-semibold text-(--danger) tabular mt-0.5">
                                    <AnimatedNumber value={totals.debt_balance} />
                                </p>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Fila inferior: Ingresos/Deudas/Ahorros son listas cortas —
                    van apiladas en una columna angosta a la izquierda. Gastos
                    Fijos y Seguimiento suelen tener más filas — cada una se
                    lleva su propia columna ancha. items-start: sin esto, CSS
                    Grid estira cada card para igualar la altura de su par en
                    la misma fila, y todo se corre hacia abajo de forma rara
                    cuando una sección crece más que las otras. */}
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.4fr)] items-start">
                    <div className="flex flex-col gap-4">
                        <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>{renderSection('income', true, true)}</div>
                        <div className="animate-fade-up" style={{ animationDelay: '60ms' }}>{renderSection('debt', false, true)}</div>
                        <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>{renderSection('saving', false, true)}</div>
                    </div>
                    <div className="animate-fade-up" style={{ animationDelay: '180ms' }}>{renderSection('fixed_expense', false)}</div>
                    <div className="animate-fade-up" style={{ animationDelay: '240ms' }}>{renderSection('tracked_expense', true)}</div>
                </div>
            </div>
        </section>
    );
};
