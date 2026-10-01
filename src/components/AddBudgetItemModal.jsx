import { useEffect, useState } from 'react';
import { Banknote, ChevronRight, CircleDollarSign, Loader2, PiggyBank, Receipt } from 'lucide-react';
import { Sheet } from './ui/Sheet';
import { CurrencyInput } from './CurrencyInput';
import { formatCurrency } from '../utils/helpers';
import { getCurrentMonthKey } from '../utils/budgetHelpers';
import { API_URL } from '../config/api';

const TOKEN_KEY = 'splitit_jwt';

// Movimientos personales de este mes. Las deudas ya NO se crean aquí: viven
// en Cuentas (Debo), con su propio historial de pagos -- antes se anotaban
// desde acá y el texto prometía que quedaban "en tu Libreta", lo cual no era
// cierto y confundía.
const CATEGORIES = [
    { section: 'income', label: 'Ingreso', hint: 'Sueldo, pago extra, dinero que entra', color: '#34c759', icon: Banknote, placeholder: 'Ej. Sueldo' },
    { section: 'tracked_expense', label: 'Gasto del día a día', hint: 'Comida, salidas, transporte', color: '#ff9500', icon: CircleDollarSign, placeholder: 'Ej. Almuerzo' },
    { section: 'fixed_expense', label: 'Gasto fijo', hint: 'Arriendo, servicios, cuotas — se repite', color: '#ff3b30', icon: Receipt, placeholder: 'Ej. Arriendo' },
    { section: 'saving', label: 'Ahorro', hint: 'Aparta dinero para una meta', color: '#af52de', icon: PiggyBank, placeholder: 'Ej. Fondo de emergencia' },
];

const authHeaders = (json) => ({
    Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
});

export const AddBudgetItemModal = ({ isOpen, onClose, onCreated, initialSection = null }) => {
    const [step, setStep] = useState('category'); // 'category' | 'savings-pick' | 'form'
    const [category, setCategory] = useState(null);
    const [existingSavings, setExistingSavings] = useState([]);
    const [loadingSavings, setLoadingSavings] = useState(false);
    const [label, setLabel] = useState('');
    const [amount, setAmount] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [contributingId, setContributingId] = useState(null);
    const [contributeAmount, setContributeAmount] = useState('');

    const monthKey = getCurrentMonthKey();

    async function pick(cat) {
        setCategory(cat);
        setError('');
        if (cat.section !== 'saving') { setStep('form'); return; }
        setStep('savings-pick');
        setLoadingSavings(true);
        try {
            const res = await fetch(`${API_URL}/budget/${monthKey}`, { headers: authHeaders() });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
            const all = Object.values(json.sections).flatMap((s) => s.items);
            const mirrored = new Set(all.filter((i) => i.linked_saving_item_id).map((i) => i.linked_saving_item_id));
            setExistingSavings(json.sections.saving.items.filter((i) => !i.is_split_synced && !mirrored.has(i.id)));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingSavings(false);
        }
    }

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen) return;
        setStep('category'); setCategory(null); setLabel(''); setAmount(''); setError(''); setContributingId(null); setContributeAmount('');
        const preset = initialSection && CATEGORIES.find((c) => c.section === initialSection);
        if (preset) pick(preset);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialSection]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const post = async (path, method, body) => {
        const res = await fetch(`${API_URL}${path}`, { method, headers: authHeaders(true), body: JSON.stringify(body) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
    };

    const contribute = async (itemId) => {
        const value = Number(contributeAmount);
        if (!(value > 0)) { setError('Escribe un monto válido'); return; }
        setSaving(true); setError('');
        try { await post(`/budget/items/${itemId}/contribute`, 'PATCH', { amount: value }); onCreated?.(); }
        catch (err) { setError(err.message); }
        finally { setSaving(false); }
    };

    const value = Number(amount);
    const missing = !label.trim() ? 'Escribe el nombre' : !(value > 0) ? 'Escribe el monto' : '';

    const create = async () => {
        if (missing) return;
        setSaving(true); setError('');
        try {
            await post(`/budget/${monthKey}/items`, 'POST', { section: category.section, label: label.trim(), budgeted_amount: value, actual_amount: value });
            onCreated?.();
        } catch (err) { setError(err.message); }
        finally { setSaving(false); }
    };

    const back = () => { setError(''); setStep('category'); setCategory(null); setContributingId(null); };
    const atRoot = step === 'category';

    return (
        <Sheet
            isOpen={isOpen}
            onClose={atRoot ? onClose : back}
            title={atRoot ? 'Movimiento personal' : category?.label}
            closeLabel={atRoot ? 'Cancelar' : 'Atrás'}
        >
            {error && <p className="t-subhead mb-3 rounded-[12px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}

            {step === 'category' && (
                <>
                    <p className="t-subhead mb-3 px-1 text-secondary">Se registra en tu presupuesto de este mes.</p>
                    <div className="ios-group">
                        {CATEGORIES.map(({ section, label: l, hint, color, icon: Icon, ...rest }) => (
                            <button key={section} type="button" className="ios-row" onClick={() => pick({ section, label: l, hint, color, icon: Icon, ...rest })}>
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]" style={{ background: color }}><Icon size={19} color="#fff" /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="t-body block font-medium">{l}</span>
                                    <span className="t-footnote block text-secondary">{hint}</span>
                                </span>
                                <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                            </button>
                        ))}
                    </div>
                    <p className="t-footnote mt-3 px-1 text-secondary">¿Una deuda? Anótala en la pestaña Cuentas → Debo.</p>
                </>
            )}

            {step === 'savings-pick' && (
                loadingSavings ? (
                    <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin" style={{ color: 'var(--text-muted)' }} /></div>
                ) : (
                    <>
                        {existingSavings.length > 0 && (
                            <>
                                <p className="t-section px-4 pb-2">Abonar a un ahorro</p>
                                <div className="ios-group">
                                    {existingSavings.map((item) => (
                                        <div key={item.id} className="px-4 py-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="min-w-0">
                                                    <span className="t-body block truncate font-medium">{item.label}</span>
                                                    <span className="t-footnote block text-secondary tabular">{formatCurrency(item.actual_amount)} juntados</span>
                                                </span>
                                                {contributingId !== item.id && (
                                                    <button type="button" className="btn btn-tinted btn-sm" onClick={() => { setContributingId(item.id); setContributeAmount(''); setError(''); }}>Abonar</button>
                                                )}
                                            </div>
                                            {contributingId === item.id && (
                                                <div className="mt-3 flex items-center gap-2">
                                                    <CurrencyInput value={contributeAmount} onChange={setContributeAmount} autoFocus className="field" />
                                                    <button type="button" className="btn btn-primary btn-sm shrink-0" disabled={saving} onClick={() => contribute(item.id)}>
                                                        {saving ? <Loader2 size={16} className="animate-spin" /> : 'Listo'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        <button type="button" className="btn btn-gray btn-block mt-4" onClick={() => setStep('form')}>Crear un ahorro nuevo</button>
                    </>
                )
            )}

            {step === 'form' && (
                <>
                    <div className="py-4 text-center">
                        <label htmlFor="budget-amount" className="t-footnote text-secondary">Monto</label>
                        <CurrencyInput id="budget-amount" value={amount} onChange={setAmount} autoFocus placeholder="$0" echo className="input-amount" />
                    </div>
                    <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={category?.placeholder || 'Descripción'} aria-label="Nombre" autoCapitalize="sentences" className="field" />
                    <div className="mt-5">
                        <button type="button" className="btn btn-primary btn-block" disabled={Boolean(missing) || saving} onClick={create}>
                            {saving ? <Loader2 size={20} className="animate-spin" /> : 'Agregar'}
                        </button>
                        {missing && <p className="t-footnote mt-2 text-center text-secondary">{missing}</p>}
                    </div>
                </>
            )}
        </Sheet>
    );
};
