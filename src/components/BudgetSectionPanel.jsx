import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CirclePlus, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { ConfirmDialog } from './ConfirmDialog';
import { AnimatedNumber } from './AnimatedNumber';
import { CurrencyInput } from './CurrencyInput';
import { formatCurrency } from '../utils/helpers';
import { SECTION_META, getVariance } from '../utils/budgetHelpers';

// Ancho fijo de la columna de acciones (toggle Ahorro + borrar) en desktop.
// Clave para que las columnas queden alineadas entre el header, cada fila
// y el formulario de agregar: si esta columna fuera `auto`, su ancho
// dependería de si esa fila en particular tiene el botón "Ahorros" o no, y
// todo el grid se desalinearía fila por fila.
const DESKTOP_GRID = 'sm:grid-cols-[1fr_108px_108px_84px]';

const numberFromInput = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
};

// Chip chico que muestra la diferencia entre lo Actual y lo Presupuestado,
// coloreado según si en esta sección eso es una buena o mala señal (ver
// `higherActualIsGood` en SECTION_META). Siempre reserva el mismo alto
// (con un espacio invisible cuando no hay diferencia) para que las filas
// con y sin variación midan exactamente igual — si no, la lista "salta".
const VarianceHint = ({ section, budgetedAmount, actualAmount }) => {
    const variance = getVariance(section, budgetedAmount, actualAmount);

    return (
        <span
            className="block text-[10px] font-semibold tabular leading-4 h-4"
            style={{ color: variance ? (variance.isGood ? 'var(--success)' : 'var(--danger)') : 'transparent' }}
        >
            {variance ? `${variance.diff > 0 ? '+' : '−'}${formatCurrency(Math.abs(variance.diff))}` : '—'}
        </span>
    );
};

const AmountField = ({ label, value, onChange, onBlur, showVariance, section, itemBudgeted, itemActual }) => (
    <label className="block min-w-0">
        <span className="block text-[9px] font-bold uppercase tracking-wider text-muted mb-0.5 sm:hidden">{label}</span>
        <CurrencyInput
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            className="w-full bg-white/5 rounded-lg px-2 py-1.5 sm:py-1 text-sm sm:text-xs text-primary font-semibold sm:font-normal outline-none text-right tabular focus:bg-white/10 transition-colors"
        />
        {showVariance && (
            <VarianceHint section={section} budgetedAmount={itemBudgeted} actualAmount={itemActual} />
        )}
    </label>
);

const RowActions = ({ item, allowSavingsLink, allowContribution, onToggleSavings, onToggleAbono, onRequestDelete }) => (
    <div className="flex items-center gap-1.5 shrink-0">
        {allowContribution && (
            <button
                type="button"
                onClick={onToggleAbono}
                title="Abonar — sumar plata a este ítem sin crear una fila nueva"
                className="text-(--success) hover:brightness-90 transition-all p-1.5 sm:p-1 shrink-0"
                aria-label={`Abonar a ${item.label}`}
            >
                <CirclePlus size={14} />
            </button>
        )}
        {allowSavingsLink && (
            <button
                type="button"
                onClick={onToggleSavings}
                title="Este monto también se suma en Ahorros, sin cargarlo dos veces"
                className={`inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full transition-all shrink-0 ${
                    item.is_savings_link
                        ? 'bg-(--accent-soft) text-(--accent)'
                        : 'bg-white/5 text-muted hover:text-secondary'
                }`}
            >
                <ArrowRight size={9} />
                <span className="sm:hidden">Ahorros</span>
            </button>
        )}
        <button
            type="button"
            onClick={onRequestDelete}
            className="text-muted hover:text-(--danger) transition-colors p-1.5 sm:p-1 shrink-0"
            aria-label={`Eliminar ${item.label}`}
        >
            <Trash2 size={14} />
        </button>
    </div>
);

const AbonoForm = ({ onSubmit, onCancel }) => {
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const n = Number(amount);
        if (!Number.isFinite(n) || n <= 0) return;
        setIsSubmitting(true);
        const ok = await onSubmit(n);
        setIsSubmitting(false);
        if (ok) onCancel();
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 py-2 px-2 sm:px-1 -mt-1 mb-1 rounded-lg bg-(--success-soft)">
            <span className="text-[11px] font-semibold text-(--success) shrink-0">Abonar</span>
            <CurrencyInput
                value={amount}
                onChange={setAmount}
                autoFocus
                placeholder="$0"
                className="flex-1 min-w-0 bg-white/10 rounded-lg px-2 py-1 text-sm text-primary outline-none text-right tabular"
            />
            <button
                type="submit"
                disabled={isSubmitting || !amount}
                className="text-(--success) disabled:opacity-40 p-1 shrink-0"
                aria-label="Confirmar abono"
            >
                <CirclePlus size={16} />
            </button>
            <button type="button" onClick={onCancel} className="text-muted hover:text-secondary p-1 shrink-0 text-sm" aria-label="Cancelar abono">
                ✕
            </button>
        </form>
    );
};

const BudgetRow = ({ item, section, allowSavingsLink, allowContribution, onUpdate, onDelete, onContribute, theme }) => {
    const [label, setLabel] = useState(item.label);
    const [budgeted, setBudgeted] = useState(String(item.budgeted_amount));
    const [actual, setActual] = useState(String(item.actual_amount));
    const [saveState, setSaveState] = useState('idle'); // 'idle' | 'saved' | 'error'
    const [isRemoving, setIsRemoving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showAbonoForm, setShowAbonoForm] = useState(false);
    const pulseTimeout = useRef(null);

    // Sincroniza los inputs locales cuando el ítem cambia desde el servidor
    // (ej. otro cliente lo editó, o se refrescó el mes).
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        setLabel(item.label);
        setBudgeted(String(item.budgeted_amount));
        setActual(String(item.actual_amount));
    }, [item.id, item.label, item.budgeted_amount, item.actual_amount]);
    /* eslint-enable react-hooks/set-state-in-effect */

    useEffect(() => () => clearTimeout(pulseTimeout.current), []);

    const commit = async (patch) => {
        const next = { label, budgeted_amount: numberFromInput(budgeted), actual_amount: numberFromInput(actual), ...patch };
        if (
            next.label === item.label &&
            next.budgeted_amount === item.budgeted_amount &&
            next.actual_amount === item.actual_amount &&
            (next.is_savings_link ?? item.is_savings_link) === item.is_savings_link
        ) {
            return;
        }
        const ok = await onUpdate(item.id, next);
        setSaveState(ok ? 'saved' : 'error');
        clearTimeout(pulseTimeout.current);
        pulseTimeout.current = setTimeout(() => setSaveState('idle'), 900);
    };

    const handleConfirmDelete = () => {
        setShowDeleteConfirm(false);
        setIsRemoving(true);
        // Deja que la animación de salida se vea antes de que el ítem
        // desaparezca de verdad cuando el mes se refresque.
        setTimeout(() => onDelete(item.id), 180);
    };

    const rowClass = `animate-row-in rounded-lg ${isRemoving ? 'animate-row-out overflow-hidden' : ''} ${
        saveState === 'saved' ? 'animate-pulse-save' : ''
    } ${saveState === 'error' ? 'animate-pulse-error' : ''}`;

    return (
        <>
            {/* Mobile: apilado en 2 líneas — descripción+acciones arriba,
                presupuestado/actual lado a lado abajo. 4 columnas fijas no
                entran cómodas en una pantalla angosta con el texto legible. */}
            <div className={`sm:hidden py-2.5 border-b border-white/5 last:border-b-0 px-2 ${rowClass}`}>
                <div className="flex items-center gap-2 mb-2">
                    <input
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        onBlur={() => commit({})}
                        className="flex-1 min-w-0 bg-transparent text-sm font-medium text-primary outline-none focus:text-(--accent) truncate"
                        placeholder="Descripción"
                        title={label}
                    />
                    <RowActions
                        item={item}
                        allowSavingsLink={allowSavingsLink}
                        allowContribution={allowContribution}
                        onToggleSavings={() => onUpdate(item.id, { is_savings_link: !item.is_savings_link })}
                        onToggleAbono={() => setShowAbonoForm((v) => !v)}
                        onRequestDelete={() => setShowDeleteConfirm(true)}
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <AmountField label="Presupuestado" value={budgeted} onChange={setBudgeted} onBlur={() => commit({})} />
                    <AmountField
                        label="Actual"
                        value={actual}
                        onChange={setActual}
                        onBlur={() => commit({})}
                        showVariance
                        section={section}
                        itemBudgeted={item.budgeted_amount}
                        itemActual={item.actual_amount}
                    />
                </div>
            </div>

            {/* Desktop: una sola fila en grid, columnas de ancho fijo. */}
            <div className={`hidden sm:grid ${DESKTOP_GRID} items-start gap-2 py-2 border-b border-white/5 last:border-b-0 px-1 ${rowClass}`}>
                <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    onBlur={() => commit({})}
                    className="bg-transparent text-sm text-primary outline-none focus:text-(--accent) min-w-0 truncate self-center h-7"
                    placeholder="Descripción"
                />
                <AmountField value={budgeted} onChange={setBudgeted} onBlur={() => commit({})} />
                <AmountField
                    value={actual}
                    onChange={setActual}
                    onBlur={() => commit({})}
                    showVariance
                    section={section}
                    itemBudgeted={item.budgeted_amount}
                    itemActual={item.actual_amount}
                />
                <div className="self-center">
                    <RowActions
                        item={item}
                        allowSavingsLink={allowSavingsLink}
                        allowContribution={allowContribution}
                        onToggleSavings={() => onUpdate(item.id, { is_savings_link: !item.is_savings_link })}
                        onToggleAbono={() => setShowAbonoForm((v) => !v)}
                        onRequestDelete={() => setShowDeleteConfirm(true)}
                    />
                </div>
            </div>

            {showAbonoForm && (
                <AbonoForm
                    onSubmit={(amount) => onContribute(item.id, amount)}
                    onCancel={() => setShowAbonoForm(false)}
                />
            )}

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                tone="danger"
                title={`¿Eliminar "${item.label}"?`}
                message="Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                theme={theme}
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </>
    );
};

const AddRowForm = ({ section, onAdd }) => {
    const [label, setLabel] = useState('');
    const [budgeted, setBudgeted] = useState('');
    const [actual, setActual] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!label.trim()) return;
        setIsSubmitting(true);
        const ok = await onAdd({
            section,
            label: label.trim(),
            budgeted_amount: numberFromInput(budgeted),
            actual_amount: numberFromInput(actual),
        });
        setIsSubmitting(false);
        if (ok) {
            setLabel('');
            setBudgeted('');
            setActual('');
        }
    };

    const submitButton = (
        <button
            type="submit"
            disabled={!label.trim() || isSubmitting}
            className="p-2 sm:p-1.5 rounded-lg bg-(--accent-soft) text-(--accent) disabled:opacity-30 hover:bg-(--accent)/25 transition-all shrink-0 active:scale-90"
            aria-label="Agregar fila"
        >
            <Plus size={14} className={isSubmitting ? 'animate-spin' : ''} />
        </button>
    );

    return (
        <form onSubmit={handleSubmit} className="pt-2">
            {/* Mobile */}
            <div className="sm:hidden space-y-2 px-2">
                <div className="flex items-center gap-2">
                    <input
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder={SECTION_META[section]?.addLabel || 'Nueva fila'}
                        className="flex-1 min-w-0 bg-white/5 rounded-lg px-2 py-1.5 text-sm text-primary outline-none focus:border-(--accent)/50 border border-transparent"
                    />
                    {submitButton}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <CurrencyInput
                        value={budgeted}
                        onChange={setBudgeted}
                        placeholder="Presupuestado"
                        className="bg-white/5 rounded-lg px-2 py-1.5 text-sm text-secondary outline-none text-right tabular"
                    />
                    <CurrencyInput
                        value={actual}
                        onChange={setActual}
                        placeholder="Actual"
                        className="bg-white/5 rounded-lg px-2 py-1.5 text-sm text-secondary outline-none text-right tabular"
                    />
                </div>
            </div>

            {/* Desktop */}
            <div className={`hidden sm:grid ${DESKTOP_GRID} items-center gap-2 px-1`}>
                <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={SECTION_META[section]?.addLabel || 'Nueva fila'}
                    className="bg-white/5 rounded-lg px-2 py-1.5 text-sm text-primary outline-none focus:border-(--accent)/50 border border-transparent min-w-0"
                />
                <CurrencyInput
                    value={budgeted}
                    onChange={setBudgeted}
                    className="bg-white/5 rounded-lg px-2 py-1.5 text-xs text-secondary outline-none text-right tabular"
                />
                <CurrencyInput
                    value={actual}
                    onChange={setActual}
                    className="bg-white/5 rounded-lg px-2 py-1.5 text-xs text-secondary outline-none text-right tabular"
                />
                {submitButton}
            </div>
        </form>
    );
};

export const BudgetSectionPanel = ({
    section,
    items,
    splitSyncItems = [],
    onAddItem,
    onUpdateItem,
    onDeleteItem,
    onContributeItem,
    onViewSyncedExpense,
    theme = 'dark',
}) => {
    const meta = SECTION_META[section];
    const allowContribution = section === 'saving' || section === 'debt';
    const manualItems = items.filter((item) => !item.is_split_synced);
    const budgetedTotal = items.reduce((sum, i) => sum + i.budgeted_amount, 0);
    const actualTotal = items.reduce((sum, i) => sum + i.actual_amount, 0);
    const totalVariance = getVariance(section, budgetedTotal, actualTotal);

    return (
        <GlassCard className="p-4 sm:p-5" theme={theme}>
            <div className="flex items-start justify-between mb-1 gap-3">
                <div className="min-w-0">
                    <h4 className="text-sm font-bold text-primary">{meta.label}</h4>
                    <p className="text-[11px] text-muted mt-0.5 leading-snug">{meta.description}</p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary tabular">
                        <AnimatedNumber value={actualTotal} />
                    </p>
                    <p className="text-[10px] text-muted tabular">
                        de {formatCurrency(budgetedTotal)} presupuestados
                    </p>
                    {totalVariance && (
                        <p
                            className="text-[10px] font-semibold tabular"
                            style={{ color: totalVariance.isGood ? 'var(--success)' : 'var(--danger)' }}
                        >
                            {totalVariance.diff > 0 ? '+' : '−'}
                            {formatCurrency(Math.abs(totalVariance.diff))} vs. plan
                        </p>
                    )}
                </div>
            </div>

            {/* Header de columnas — solo tiene sentido en desktop; en mobile
                cada input ya trae su propia etiqueta arriba. */}
            {(manualItems.length > 0 || splitSyncItems.length > 0) && (
                <div className={`hidden sm:grid ${DESKTOP_GRID} gap-2 mt-3 mb-1 px-1`}>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted">Descripción</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted text-right">Presupuestado</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted text-right">Actual</span>
                    <span />
                </div>
            )}

            {manualItems.length === 0 && splitSyncItems.length === 0 ? (
                <p className="text-xs text-muted py-3">
                    Sin ítems todavía — agregá el primero con el formulario de abajo.
                </p>
            ) : (
                <div className="mt-1">
                    {manualItems.map((item) => (
                        <BudgetRow
                            key={item.id}
                            item={item}
                            section={section}
                            allowSavingsLink={meta.allowSavingsLink}
                            allowContribution={allowContribution}
                            onUpdate={onUpdateItem}
                            onDelete={onDeleteItem}
                            onContribute={onContributeItem}
                            theme={theme}
                        />
                    ))}
                </div>
            )}

            <AddRowForm section={section} onAdd={onAddItem} />

            {splitSyncItems.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/10">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted mb-1">
                        Gastos compartidos · Split.it
                    </p>
                    <p className="text-[10px] text-muted mb-2 leading-snug">
                        Se agregan solos cuando pagás o te toca pagar un gasto compartido — no se editan acá, tocá para ver el gasto.
                    </p>
                    <div className="space-y-1.5">
                        {splitSyncItems.map((item) => {
                            // budgeted_amount se fija al monto total original al crearse;
                            // actual_amount baja con cada liquidación de un participante.
                            // La diferencia es exactamente lo que ya te devolvieron.
                            const alreadyReturned = item.budgeted_amount - item.actual_amount;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => onViewSyncedExpense?.(item.split_expense_id)}
                                    className="w-full flex items-center justify-between gap-2 rounded-xl bg-(--info-soft) px-3 py-2 text-left hover:brightness-95 transition-all animate-row-in"
                                >
                                    <span className="text-xs text-primary truncate flex items-center gap-1.5 min-w-0">
                                        <span className="truncate" title={item.label}>{item.label}</span>
                                        <ExternalLink size={11} className="text-(--info) shrink-0" />
                                    </span>
                                    <span className="text-right shrink-0">
                                        <span className="block text-xs font-semibold text-(--info) tabular">
                                            {formatCurrency(item.actual_amount)}
                                        </span>
                                        {alreadyReturned > 0 && (
                                            <span className="block text-[9px] text-(--success) tabular">
                                                ya te devolvieron {formatCurrency(alreadyReturned)}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </GlassCard>
    );
};
