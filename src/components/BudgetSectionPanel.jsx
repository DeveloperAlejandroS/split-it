import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, CirclePlus, ExternalLink, PiggyBank, Plus, Trash2, X as XIcon } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { ConfirmDialog } from './ConfirmDialog';
import { AnimatedNumber } from './AnimatedNumber';
import { CurrencyInput } from './CurrencyInput';
import { formatCurrency, numberOrZero } from '../utils/helpers';
import { SECTION_META, getVariance } from '../utils/budgetHelpers';

// Ancho fijo de la columna de acciones (toggle Ahorro + borrar) en desktop.
// Clave para que las columnas queden alineadas entre el header, cada fila
// y el formulario de agregar: si esta columna fuera `auto`, su ancho
// dependería de si esa fila en particular tiene el botón "Ahorros" o no, y
// todo el grid se desalinearía fila por fila. Los tres anchos se recortaron
// (108/108/84 → 88/88/64) para que la grilla siga entrando sin aplastar la
// columna de descripción en anchos de tablet donde el layout de 3 columnas
// de PersonalBudgetView deja menos espacio por panel (ver el rediseño de
// esa grilla — antes 342px de columna dejaba la descripción en ~64px).
const DESKTOP_GRID = 'sm:grid-cols-[1fr_88px_88px_64px]';

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

// El botón "→ Ahorros" ya no prende/apaga un toggle que auto-creaba un
// espejo — abre un mini picker con los ahorros que YA existen este mes,
// para elegir a cuál de ellos se destina el dinero (o quitar el vínculo).
// No se puede "crear" un ahorro desde aquí: si todavía no existe ninguno,
// el picker lo deja clarísimo en vez de inventar uno solo.
const SavingsLinkPicker = ({ item, savingsItems, onLink }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return undefined;
        const handleClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    const linkedItem = savingsItems.find((s) => s.id === item.linked_saving_item_id);

    const handlePick = (targetId) => {
        setIsOpen(false);
        onLink(targetId);
    };

    return (
        <div className="relative shrink-0" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                title={linkedItem ? `Sumando a "${linkedItem.label}"` : 'Vincular a un ahorro que ya exista'}
                aria-label={linkedItem ? `Sumando a ${linkedItem.label}` : 'Vincular a un ahorro'}
                className={`inline-flex items-center gap-0.5 p-1.5 rounded-full transition-all shrink-0 ${
                    linkedItem ? 'bg-(--accent-soft) text-(--accent)' : 'bg-white/5 text-muted hover:text-secondary'
                }`}
            >
                <ArrowRight size={11} className="shrink-0" />
                <PiggyBank size={13} className="shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-7 z-70 w-52 rounded-2xl border border-white/10 bg-(--surface-strong) backdrop-blur-lg shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted px-1.5 pb-1.5">
                        Sumar este monto a...
                    </p>
                    {savingsItems.length === 0 ? (
                        <p className="text-[10px] text-muted px-1.5 pb-1 leading-snug">
                            Todavía no tienes ningún ahorro creado este mes — crea uno primero en la sección Ahorros.
                        </p>
                    ) : (
                        <div className="space-y-0.5 max-h-40 overflow-y-auto">
                            {savingsItems.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => handlePick(s.id)}
                                    className={`w-full flex items-center justify-between gap-1.5 text-left px-1.5 py-1.5 rounded-lg text-[11px] transition-colors ${
                                        s.id === item.linked_saving_item_id
                                            ? 'bg-(--accent-soft) text-(--accent)'
                                            : 'text-secondary hover:bg-white/5 hover:text-primary'
                                    }`}
                                >
                                    <span className="truncate">{s.label}</span>
                                    {s.id === item.linked_saving_item_id && <Check size={11} className="shrink-0" />}
                                </button>
                            ))}
                        </div>
                    )}
                    {item.linked_saving_item_id && (
                        <button
                            type="button"
                            onClick={() => handlePick(null)}
                            className="w-full flex items-center gap-1 mt-1 pt-1 border-t border-white/10 px-1.5 py-1 text-[10px] text-muted hover:text-(--danger) transition-colors"
                        >
                            <XIcon size={10} /> Quitar vínculo
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

const RowActions = ({ item, allowSavingsLink, allowContribution, savingsItems, onLinkSavings, onToggleAbono, onRequestDelete }) => (
    <div className="flex items-center gap-1.5 shrink-0">
        {allowContribution && (
            <button
                type="button"
                onClick={onToggleAbono}
                title="Abonar — sumar dinero a este ítem sin crear una fila nueva"
                className="text-(--success) hover:brightness-90 transition-all p-1.5 sm:p-1 shrink-0"
                aria-label={`Abonar a ${item.label}`}
            >
                <CirclePlus size={14} />
            </button>
        )}
        {allowSavingsLink && (
            <SavingsLinkPicker item={item} savingsItems={savingsItems || []} onLink={onLinkSavings} />
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

// Submayor de deudas: una fila por acreedor, con lo que le debes y un botón
// para abonarle — espejo exacto de las tarjetas de Libreta, pero para lo
// que TÚ debes en vez de lo que te deben a ti. Vive dentro de la sección
// Deudas del presupuesto (no aparte, como Libreta), porque aquí el agregado
// (Balance Deudas) ya vive en esta misma pantalla.
const DebtEntryRow = ({ entry, onContribute, onDelete }) => {
    const [showAbonoForm, setShowAbonoForm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        await onDelete(entry.id);
        setIsDeleting(false);
        setShowDeleteConfirm(false);
    };

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-primary truncate">{entry.creditor_name}</p>
                    <p className="text-[10px] text-muted tabular">
                        Debes {formatCurrency(entry.remaining)} de {formatCurrency(entry.amount_owed)}
                    </p>
                </div>
                {!showAbonoForm && (
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            type="button"
                            onClick={() => setShowAbonoForm(true)}
                            className="text-(--success) hover:brightness-90 p-1"
                            aria-label={`Abonar a ${entry.creditor_name}`}
                        >
                            <CirclePlus size={15} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="text-muted hover:text-(--danger) p-1"
                            aria-label={`Eliminar deuda con ${entry.creditor_name}`}
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                )}
            </div>
            {showAbonoForm && (
                <div className="mt-2">
                    <AbonoForm onSubmit={(amount) => onContribute(entry.id, amount)} onCancel={() => setShowAbonoForm(false)} />
                </div>
            )}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                tone="danger"
                title={`¿Eliminar la deuda con "${entry.creditor_name}"?`}
                message="Esta acción no se puede deshacer. Los pagos que ya hiciste siguen contando en tu presupuesto — esto solo borra el registro de la deuda."
                confirmLabel="Eliminar"
                isLoading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </div>
    );
};

const BudgetRow = ({ item, section, allowSavingsLink, allowContribution, savingsItems, onUpdate, onDelete, onContribute, theme, compact }) => {
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
            next.actual_amount === item.actual_amount
        ) {
            return;
        }
        const ok = await onUpdate(item.id, next);
        setSaveState(ok ? 'saved' : 'error');
        clearTimeout(pulseTimeout.current);
        pulseTimeout.current = setTimeout(() => setSaveState('idle'), 900);
    };

    // El vínculo a un ahorro se aplica al toque (no espera a un blur de
    // input) — es una acción propia, no parte del formulario de label/monto.
    const handleLinkSavings = async (targetId) => {
        const ok = await onUpdate(item.id, { link_to_saving_item_id: targetId });
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
            {/* Mobile (o cualquier columna angosta cuando `compact`): apilado
                en 2 líneas — descripción+acciones arriba, presupuestado/
                actual lado a lado abajo. 4 columnas fijas no entran cómodas
                en un espacio angosto con el texto legible. */}
            <div className={`${compact ? '' : 'sm:hidden'} py-2.5 border-b border-white/5 last:border-b-0 px-2 ${rowClass}`}>
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
                        savingsItems={savingsItems}
                        onLinkSavings={handleLinkSavings}
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

            {/* Desktop: una sola fila en grid, columnas de ancho fijo — se
                salta del todo cuando `compact` (columna angosta como
                Ingresos/Deudas/Ahorros, donde ese grid nunca entra cómodo). */}
            <div className={`${compact ? 'hidden' : `hidden sm:grid ${DESKTOP_GRID}`} items-start gap-2 py-2 border-b border-white/5 last:border-b-0 px-1 ${rowClass}`}>
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
                        savingsItems={savingsItems}
                        onLinkSavings={handleLinkSavings}
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

const AddRowForm = ({ section, onAdd, compact }) => {
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
            {/* Mobile (o compact) */}
            <div className={`${compact ? '' : 'sm:hidden'} space-y-2 px-2`}>
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
            <div className={`${compact ? 'hidden' : `hidden sm:grid ${DESKTOP_GRID}`} items-center gap-2 px-1`}>
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
    libretaSyncItems = [],
    debtEntries = [],
    onAddItem,
    onUpdateItem,
    onDeleteItem,
    onContributeItem,
    onViewSyncedExpense,
    onViewLibreta,
    onContributeDebtEntry,
    onDeleteDebtEntry,
    openingCash,
    savingsItems = [],
    compact = false,
    theme = 'dark',
}) => {
    const meta = SECTION_META[section];
    const allowContribution = section === 'saving' || section === 'debt';
    // Ni los sincronizados con Split.it, ni los que vienen de un abono de la
    // Libreta, ni los que vienen de un pago a una deuda se editan aquí —
    // los tres se muestran aparte, de solo lectura, en vez de aparecer como
    // una fila editable que en realidad va a rechazar cualquier cambio.
    const manualItems = items.filter((item) => !item.is_split_synced && !item.libreta_entry_id && !item.debt_entry_id);
    const debtPaymentItems = items.filter((item) => item.debt_entry_id);
    const pendingDebtEntries = debtEntries.filter((e) => e.status !== 'paid');
    // Los ítems `is_pending` (obligación de un gasto compartido que todavía
    // no se pagó de verdad) se listan igual en `items`, pero no cuentan aquí
    // — mismo criterio que `computeMonthTotals` en el backend, así el total
    // del encabezado no incluye dinero que todavía no se movió de verdad.
    const confirmedItems = items.filter((item) => !item.is_pending);
    const budgetedTotal = confirmedItems.reduce((sum, i) => sum + i.budgeted_amount, 0);
    const actualTotal = confirmedItems.reduce((sum, i) => sum + i.actual_amount, 0);
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

            {/* Header de columnas — solo tiene sentido en la vista de grid;
                en mobile o en columna angosta (`compact`) cada input ya trae
                su propia etiqueta arriba. */}
            {!compact && (manualItems.length > 0 || splitSyncItems.length > 0 || libretaSyncItems.length > 0 || debtPaymentItems.length > 0) && (
                <div className={`hidden sm:grid ${DESKTOP_GRID} gap-2 mt-3 mb-1 px-1`}>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted truncate">Descripción</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted text-right truncate">Presup.</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted text-right truncate">Actual</span>
                    <span />
                </div>
            )}

            {/* Submayor de deudas: a quién le debes y cuánto, con abono
                directo — la razón de ser de esta sección. Los ítems manuales
                de abajo quedan para gastos sueltos que no quieras itemizar. */}
            {section === 'debt' && pendingDebtEntries.length > 0 && (
                <div className="space-y-1.5 mb-3">
                    {pendingDebtEntries.map((entry) => (
                        <DebtEntryRow key={entry.id} entry={entry} onContribute={onContributeDebtEntry} onDelete={onDeleteDebtEntry} />
                    ))}
                </div>
            )}

            {/* Saldo que sobró el mes anterior — informativo nomás: ya está
                incluido en Balance como "Saldo anterior" (ver Flujo de Caja),
                así que NO se suma aquí arriba para no contarlo dos veces. Se
                muestra en Ingresos porque es, en la práctica, dinero
                disponible para gastar este mes. */}
            {section === 'income' && numberOrZero(openingCash) !== 0 && (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-(--accent-soft) px-3 py-2 mb-1.5 mt-1">
                    <span className="text-xs text-primary">Saldo del mes anterior</span>
                    <span className="text-xs font-semibold text-(--accent-strong) tabular">
                        {formatCurrency(openingCash)}
                    </span>
                </div>
            )}

            {manualItems.length === 0 && splitSyncItems.length === 0 && libretaSyncItems.length === 0 && debtPaymentItems.length === 0 ? (
                <p className="text-xs text-muted py-3">
                    Sin ítems todavía — agrega el primero con el formulario de abajo.
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
                            savingsItems={savingsItems}
                            onUpdate={onUpdateItem}
                            onDelete={onDeleteItem}
                            onContribute={onContributeItem}
                            theme={theme}
                            compact={compact}
                        />
                    ))}
                </div>
            )}

            <AddRowForm section={section} onAdd={onAddItem} compact={compact} />

            {splitSyncItems.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/10">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted mb-1">
                        Gastos compartidos · Split.it
                    </p>
                    <p className="text-[10px] text-muted mb-2 leading-snug">
                        {section === 'income'
                            ? 'Reembolsos de gastos que le adelantaste a alguien — no se editan aquí, toca ver el gasto.'
                            : 'Se agregan solos cuando pagas o te toca pagar un gasto compartido — no se editan aquí, toca ver el gasto.'}
                    </p>
                    <div className="space-y-1.5">
                        {splitSyncItems.map((item) => {
                            // is_pending = todavía no pagaste de verdad tu parte, así que
                            // esto no cuenta en tu Balance — se marca distinto (ámbar) para
                            // que se note que es una obligación visible, no dinero movido.
                            const isPending = item.is_pending;
                            const isIncomeRefund = item.split_role === 'payer_income';
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => onViewSyncedExpense?.(item.split_expense_id)}
                                    className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left hover:brightness-95 transition-all animate-row-in ${
                                        isPending ? 'bg-(--warning-soft)' : isIncomeRefund ? 'bg-(--success-soft)' : 'bg-(--info-soft)'
                                    }`}
                                >
                                    <span className="text-xs text-primary truncate flex items-center gap-1.5 min-w-0">
                                        <span className="line-clamp-2" title={item.label}>{item.label}</span>
                                        <ExternalLink size={11} className={`shrink-0 ${isPending ? 'text-(--warning)' : isIncomeRefund ? 'text-(--success)' : 'text-(--info)'}`} />
                                    </span>
                                    <span className="text-right shrink-0">
                                        <span className={`block text-xs font-semibold tabular ${isPending ? 'text-(--warning)' : isIncomeRefund ? 'text-(--success)' : 'text-(--info)'}`}>
                                            {formatCurrency(item.actual_amount)}
                                        </span>
                                        {isPending ? (
                                            <span className="block text-[9px] text-(--warning) font-bold uppercase tracking-wide">
                                                Pendiente de pago
                                            </span>
                                        ) : isIncomeRefund ? (
                                            <span className="block text-[9px] text-(--success) font-bold uppercase tracking-wide">
                                                Reembolso recibido
                                            </span>
                                        ) : item.split_role === 'participant' ? (
                                            <span className="block text-[9px] text-(--success) font-bold uppercase tracking-wide">
                                                Ya pagado
                                            </span>
                                        ) : (
                                            <span className="block text-[9px] text-(--info) font-bold uppercase tracking-wide">
                                                Tu parte
                                            </span>
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {libretaSyncItems.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/10">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted mb-1">
                        Abonos de tu Libreta
                    </p>
                    <p className="text-[10px] text-muted mb-2 leading-snug">
                        Se agregan solos cuando registras un abono en la Libreta — no se editan aquí, toca ver la deuda.
                    </p>
                    <div className="space-y-1.5">
                        {libretaSyncItems.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onViewLibreta?.()}
                                className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left hover:brightness-95 transition-all animate-row-in bg-(--success-soft)"
                            >
                                <span className="text-xs text-primary truncate flex items-center gap-1.5 min-w-0">
                                    <span className="line-clamp-2" title={item.label}>{item.label}</span>
                                    <ExternalLink size={11} className="text-(--success) shrink-0" />
                                </span>
                                <span className="text-right shrink-0">
                                    <span className="block text-xs font-semibold tabular text-(--success)">
                                        {formatCurrency(item.actual_amount)}
                                    </span>
                                    <span className="block text-[9px] text-(--success) font-bold uppercase tracking-wide">
                                        Abono recibido
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {debtPaymentItems.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/10">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted mb-1">
                        Pagos a tus deudas
                    </p>
                    <p className="text-[10px] text-muted mb-2 leading-snug">
                        Se agregan solos cuando le abonas a una deuda de arriba — no se editan aquí.
                    </p>
                    <div className="space-y-1.5">
                        {debtPaymentItems.map((item) => (
                            <div
                                key={item.id}
                                className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 bg-(--danger-soft) animate-row-in"
                            >
                                <span className="text-xs text-primary line-clamp-2 min-w-0" title={item.label}>{item.label}</span>
                                <span className="block text-xs font-semibold tabular text-(--danger) shrink-0">
                                    {formatCurrency(item.actual_amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </GlassCard>
    );
};
