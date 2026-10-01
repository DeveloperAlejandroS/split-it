import { useEffect, useState } from 'react';
import { CircleNotch, Money, PiggyBank, Repeat, ShoppingBag } from '@phosphor-icons/react';
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
    { section: 'income', label: 'Ingreso', hint: 'Sueldo, pago extra, dinero que entra', tile: 'tile-teal', icon: Money, placeholder: 'Ej. Sueldo' },
    { section: 'tracked_expense', label: 'Gasto del día a día', hint: 'Comida, salidas, transporte', tile: 'tile-violet', icon: ShoppingBag, placeholder: 'Ej. Almuerzo' },
    { section: 'fixed_expense', label: 'Gasto fijo', hint: 'Arriendo, servicios, cuotas. Se repite', tile: 'tile-lilac', icon: Repeat, placeholder: 'Ej. Arriendo' },
    { section: 'saving', label: 'Ahorro', hint: 'Aparta dinero para una meta', tile: 'tile-coral', icon: PiggyBank, placeholder: 'Ej. Fondo de emergencia' },
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
            {error && <p className="small mb-3 rounded-[12px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}

            {step === 'category' && (
                <>
                    <p className="small mb-3 px-1">Se registra en tu presupuesto de este mes.</p>
                    <div className="grid grid-cols-2 gap-3">
                        {CATEGORIES.map(({ section, label: l, hint, tile, icon: Icon, ...rest }) => (
                            <button
                                key={section}
                                type="button"
                                className={`tile ${tile} flex min-h-[140px] flex-col justify-between p-4 text-left transition-transform active:scale-[0.96]`}
                                style={{ boxShadow: '0 16px 30px -16px rgba(60, 30, 160, 0.5)' }}
                                onClick={() => pick({ section, label: l, hint, tile, icon: Icon, ...rest })}
                            >
                                <span className="bubble h-11 w-11 rounded-full" style={{ background: 'rgba(255,255,255,0.28)' }}><Icon size={24} weight="fill" /></span>
                                <span>
                                    <span className="heading block">{l}</span>
                                    <span className="block text-[13px] leading-tight opacity-85">{hint}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                    <p className="small mt-4 px-1">¿Una deuda? Anótala en Cuentas, en Debo.</p>
                </>
            )}

            {step === 'savings-pick' && (
                loadingSavings ? (
                    <div className="flex justify-center py-10"><CircleNotch size={22} className="animate-spin" style={{ color: 'var(--text-muted)' }} /></div>
                ) : (
                    <>
                        {existingSavings.length > 0 && (
                            <>
                                <p className="heading px-1 pb-2">Abonar a un ahorro</p>
                                <div className="stack">
                                    {existingSavings.map((item) => (
                                        <div key={item.id} className="px-4 py-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="min-w-0">
                                                    <span className="body block truncate font-medium">{item.label}</span>
                                                    <span className="small block text-secondary tabular">{formatCurrency(item.actual_amount)} juntados</span>
                                                </span>
                                                {contributingId !== item.id && (
                                                    <button type="button" className="btn btn-tinted btn-sm" onClick={() => { setContributingId(item.id); setContributeAmount(''); setError(''); }}>Abonar</button>
                                                )}
                                            </div>
                                            {contributingId === item.id && (
                                                <div className="mt-3 flex items-center gap-2">
                                                    <CurrencyInput value={contributeAmount} onChange={setContributeAmount} autoFocus className="field" />
                                                    <button type="button" className="btn btn-primary btn-sm shrink-0" disabled={saving} onClick={() => contribute(item.id)}>
                                                        {saving ? <CircleNotch size={16} className="animate-spin" /> : 'Listo'}
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
                        <label htmlFor="budget-amount" className="small text-secondary">Monto</label>
                        <CurrencyInput id="budget-amount" value={amount} onChange={setAmount} autoFocus placeholder="$0" echo className="input-amount" />
                    </div>
                    <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={category?.placeholder || 'Descripción'} aria-label="Nombre" autoCapitalize="sentences" className="field" />
                    <div className="mt-5">
                        <button type="button" className="btn btn-primary btn-block" disabled={Boolean(missing) || saving} onClick={create}>
                            {saving ? <CircleNotch size={20} className="animate-spin" /> : 'Agregar'}
                        </button>
                        {missing && <p className="small mt-2 text-center text-secondary">{missing}</p>}
                    </div>
                </>
            )}
        </Sheet>
    );
};
