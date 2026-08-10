import { useEffect, useState } from 'react';
import { ArrowLeft, Banknote, CircleDollarSign, HandCoins, Loader2, PiggyBank, Receipt, X } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { CurrencyInput } from './CurrencyInput';
import { formatCurrency } from '../utils/helpers';
import { getCurrentMonthKey } from '../utils/budgetHelpers';
import { API_URL } from '../config/api';

const TOKEN_KEY = 'splitit_jwt';

// Las 5 categorías del presupuesto personal — el botón de agregar del rail/
// dock abre esto en vez del formulario de gasto compartido cuando estás
// parado en "Gastos personales", en vez de forzarte a ir a buscar la
// sección correcta a mano cada vez.
const CATEGORIES = [
    { section: 'income', label: 'Ingreso', hint: 'Sueldo, pago extra, préstamo que te hacen', icon: Banknote },
    { section: 'saving', label: 'Ahorro', hint: 'Súmale a un fondo que ya tienes, o crea uno nuevo', icon: PiggyBank },
    { section: 'debt', label: 'Deuda', hint: 'Registra una deuda nueva', icon: HandCoins },
    { section: 'fixed_expense', label: 'Gasto fijo', hint: 'Arriendo, servicios, cuotas — se repite cada mes', icon: Receipt },
    { section: 'tracked_expense', label: 'Gasto ocasional', hint: 'Comida, salidas, transporte del día a día', icon: CircleDollarSign },
];

const authHeaders = (token, withBody) => ({
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    ...(withBody ? { 'Content-Type': 'application/json' } : {}),
});

export const AddBudgetItemModal = ({ isOpen, onClose, onCreated, theme = 'dark' }) => {
    const [step, setStep] = useState('category'); // 'category' | 'savings-pick' | 'form'
    const [category, setCategory] = useState(null);
    const [existingSavings, setExistingSavings] = useState([]);
    const [isLoadingSavings, setIsLoadingSavings] = useState(false);
    const [label, setLabel] = useState('');
    const [amount, setAmount] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [contributingId, setContributingId] = useState(null);
    const [contributeAmount, setContributeAmount] = useState('');

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen) return;
        setStep('category');
        setCategory(null);
        setLabel('');
        setAmount('');
        setError('');
        setContributingId(null);
        setContributeAmount('');
    }, [isOpen]);
    /* eslint-enable react-hooks/set-state-in-effect */

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const monthKey = getCurrentMonthKey();

    const pickCategory = async (cat) => {
        setCategory(cat);
        setError('');
        if (cat.section !== 'saving') {
            setStep('form');
            return;
        }
        // Ahorro: primero mostramos los fondos que ya existen para poder
        // abonarles directo, en vez de forzar a crear una fila nueva cada vez.
        setStep('savings-pick');
        setIsLoadingSavings(true);
        try {
            const token = localStorage.getItem(TOKEN_KEY);
            const res = await fetch(`${API_URL}/budget/${monthKey}`, { headers: authHeaders(token) });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
            const allItems = Object.values(json.sections).flatMap((s) => s.items);
            const mirrorIds = new Set(allItems.filter((i) => i.linked_saving_item_id).map((i) => i.linked_saving_item_id));
            const pickable = json.sections.saving.items.filter((i) => !i.is_split_synced && !mirrorIds.has(i.id));
            setExistingSavings(pickable);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoadingSavings(false);
        }
    };

    const submitContribution = async (itemId) => {
        const value = Number(contributeAmount);
        if (!Number.isFinite(value) || value <= 0) {
            setError('Ingresa un monto válido');
            return;
        }
        setIsSaving(true);
        setError('');
        try {
            const token = localStorage.getItem(TOKEN_KEY);
            const res = await fetch(`${API_URL}/budget/items/${itemId}/contribute`, {
                method: 'PATCH',
                headers: authHeaders(token, true),
                body: JSON.stringify({ amount: value }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
            onCreated?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // La sección `debt` del presupuesto representa PAGOS hechos este mes a
    // una deuda que ya existía (así lo usa `debt_balance = saldo inicial −
    // pagos del mes` — ver budgetSyncService). Una deuda NUEVA es lo
    // contrario: aumenta cuánto debes, no lo baja. Por eso no se crea como
    // un ítem más de esa sección (invertiría el signo) — se registra en el
    // submayor de deudas (`POST /debts`), que además de subir el agregado
    // le da rastro individual: a quién le debes, cuánto, y sus abonos.
    const submitNewItem = async () => {
        if (!label.trim()) {
            setError('Ponle un nombre');
            return;
        }
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0) {
            setError('Ingresa un monto válido');
            return;
        }
        setIsSaving(true);
        setError('');
        try {
            const token = localStorage.getItem(TOKEN_KEY);

            if (category.section === 'debt') {
                const res = await fetch(`${API_URL}/debts`, {
                    method: 'POST',
                    headers: authHeaders(token, true),
                    body: JSON.stringify({ creditor_name: label.trim(), amount_owed: value }),
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
                onCreated?.();
                return;
            }

            const res = await fetch(`${API_URL}/budget/${monthKey}/items`, {
                method: 'POST',
                headers: authHeaders(token, true),
                body: JSON.stringify({
                    section: category.section,
                    label: label.trim(),
                    budgeted_amount: value,
                    actual_amount: value,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
            onCreated?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const goBack = () => {
        setError('');
        setStep('category');
        setCategory(null);
        setContributingId(null);
    };

    return (
        <div
            className="fixed inset-0 z-95 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 sm:p-6"
            onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
            role="presentation"
        >
            <GlassCard theme={theme} className="relative w-full max-w-md rounded-4xl p-6 border border-white/10 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 min-w-0">
                        {step !== 'category' && (
                            <button
                                type="button"
                                onClick={goBack}
                                className="w-8 h-8 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center shrink-0"
                                aria-label="Volver"
                            >
                                <ArrowLeft size={14} className="text-secondary" />
                            </button>
                        )}
                        <h4 className="text-base font-bold text-primary truncate">
                            {step === 'category' ? 'Agregar a tu presupuesto' : category?.label}
                        </h4>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center shrink-0"
                        aria-label="Cerrar"
                    >
                        <X size={14} className="text-secondary" />
                    </button>
                </div>

                {error && (
                    <div className="mb-3 p-2.5 rounded-xl text-xs text-primary" style={{ background: 'var(--danger-soft)', border: '1px solid rgba(232,99,122,0.25)' }}>
                        {error}
                    </div>
                )}

                {step === 'category' && (
                    <div className="grid grid-cols-2 gap-2.5">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.section}
                                type="button"
                                onClick={() => pickCategory(cat)}
                                className="flex flex-col items-start gap-2 p-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-(--accent)/40 transition-all text-left active:scale-[0.98]"
                            >
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                    <cat.icon size={16} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-primary">{cat.label}</p>
                                    <p className="text-[10px] text-muted leading-snug mt-0.5">{cat.hint}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {step === 'savings-pick' && (
                    <div className="space-y-3">
                        {isLoadingSavings ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 size={20} className="animate-spin text-(--accent)" />
                            </div>
                        ) : (
                            <>
                                {existingSavings.length > 0 && (
                                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Abonar a un fondo existente</p>
                                        {existingSavings.map((item) => (
                                            <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="text-sm text-primary truncate">{item.label}</p>
                                                        <p className="text-[10px] text-muted tabular">{formatCurrency(item.actual_amount)} juntados</p>
                                                    </div>
                                                    {contributingId !== item.id && (
                                                        <button
                                                            type="button"
                                                            onClick={() => { setContributingId(item.id); setContributeAmount(''); setError(''); }}
                                                            className="shrink-0 text-xs font-bold text-(--accent) hover:brightness-95 px-2 py-1"
                                                        >
                                                            Abonar
                                                        </button>
                                                    )}
                                                </div>
                                                {contributingId === item.id && (
                                                    <div className="flex items-center gap-1.5 mt-2">
                                                        <CurrencyInput
                                                            value={contributeAmount}
                                                            onChange={setContributeAmount}
                                                            autoFocus
                                                            className="flex-1 min-w-0 bg-white/5 rounded-lg px-2 py-1.5 text-sm text-primary outline-none border border-(--accent)/40 tabular"
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled={isSaving}
                                                            onClick={() => submitContribution(item.id)}
                                                            className="px-3 py-1.5 rounded-lg bg-(--success) text-white text-xs font-bold disabled:opacity-50"
                                                        >
                                                            {isSaving ? <Loader2 size={12} className="animate-spin" /> : 'Listo'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setStep('form')}
                                    className="w-full text-center text-xs font-bold text-secondary hover:text-primary py-2 border border-dashed border-white/15 rounded-xl hover:border-(--accent)/40 transition-all"
                                >
                                    + Crear un ahorro nuevo
                                </button>
                            </>
                        )}
                    </div>
                )}

                {step === 'form' && (
                    <div className="space-y-3">
                        {category?.section === 'debt' && (
                            <p className="text-[10px] text-muted leading-snug bg-white/5 rounded-xl p-2.5">
                                Esto suma al total que debes (Balance Deudas pendiente) y queda registrado en tu Libreta de deudas — vas a poder abonarle de a poco desde ahí.
                            </p>
                        )}
                        <label className="block">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 block">Nombre</span>
                            <input
                                autoFocus
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder={category?.section === 'saving' ? 'Ej. Fondo de emergencia' : category?.section === 'debt' ? 'Ej. Tarjeta de crédito' : 'Descripción'}
                                className="w-full bg-white/5 rounded-xl px-3 py-2.5 text-sm text-primary outline-none border border-transparent focus:border-(--accent)/50"
                            />
                        </label>
                        <label className="block">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 block">Monto</span>
                            <CurrencyInput
                                value={amount}
                                onChange={setAmount}
                                className="w-full bg-white/5 rounded-xl px-3 py-2.5 text-sm text-primary outline-none border border-transparent focus:border-(--accent)/50 tabular"
                            />
                        </label>
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={submitNewItem}
                            className="w-full py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))', color: 'var(--accent-contrast)' }}
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                            Agregar
                        </button>
                    </div>
                )}
            </GlassCard>
        </div>
    );
};
