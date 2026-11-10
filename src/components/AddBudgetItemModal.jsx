import { useEffect, useState } from 'react';
import { CircleNotch, Money, PiggyBank, Repeat, ShoppingBag } from '@phosphor-icons/react';
import { Sheet } from './ui/Sheet';
import { CurrencyInput } from './CurrencyInput';
import { formatCurrency } from '../utils/helpers';
import { getCurrentMonthKey, monthKeyToLabel } from '../utils/budgetHelpers';
import { API_URL } from '../config/api';

const TOKEN_KEY = 'splitit_jwt';

// Movimientos personales de este mes. Las deudas ya NO se crean aquí: viven
// en Cuentas (Debo), con su propio historial de pagos -- antes se anotaban
// desde acá y el texto prometía que quedaban "en tu Libreta", lo cual no era
// cierto y confundía.
const CATEGORIES = [
    { section: 'income', label: 'Ingreso', hint: 'Sueldo, pago extra, dinero que entra', tile: 'tile-teal', icon: Money, placeholder: 'Ej. Sueldo' },
    { section: 'tracked_expense', label: 'Gasto del día a día', hint: 'Comida, salidas, transporte', tile: 'tile-coral', icon: ShoppingBag, placeholder: 'Ej. Almuerzo' },
    { section: 'fixed_expense', label: 'Gasto fijo', hint: 'Arriendo, servicios, cuotas. Se repite', tile: 'tile-coral', icon: Repeat, placeholder: 'Ej. Arriendo' },
    { section: 'saving', label: 'Ahorro', hint: 'Aparta dinero para una meta', tile: 'tile-violet', icon: PiggyBank, placeholder: 'Ej. Fondo de emergencia' },
];

const authHeaders = (json) => ({
    Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
});

export const AddBudgetItemModal = ({ isOpen, onClose, onCreated, initialSection = null, monthKey: monthKeyProp = null }) => {
    const [step, setStep] = useState('category'); // 'category' | 'savings-pick' | 'form'
    const [category, setCategory] = useState(null);
    const [existingSavings, setExistingSavings] = useState([]);
    const [loadingSavings, setLoadingSavings] = useState(false);
    const [label, setLabel] = useState('');
    const [amount, setAmount] = useState('');
    const [planned, setPlanned] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [contributingId, setContributingId] = useState(null);
    const [contributeAmount, setContributeAmount] = useState('');
    // Gasto fijo: solo este mes, cada mes, o una compra repartida en cuotas.
    const [repeat, setRepeat] = useState('once');
    const [count, setCount] = useState('12');

    // Se agrega al mes que se está viendo; si el modal se abre desde otra pantalla, al actual.
    const monthKey = monthKeyProp || getCurrentMonthKey();
    const monthLabel = monthKeyToLabel(monthKey).toLowerCase();
    const fromPreset = Boolean(initialSection && CATEGORIES.some((c) => c.section === initialSection));

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
            const funds = json.savings_funds || [];
            // Los de este mes (con lo acumulado entre meses) y los que vienen de meses anteriores.
            const thisMonth = json.sections.saving.items.filter((i) => !i.is_split_synced && !mirrored.has(i.id))
                .map((i) => ({ key: `i${i.id}`, id: i.id, label: i.label, total: funds.find((f) => f.item_id === i.id)?.total ?? i.actual_amount }));
            const carried = funds.filter((f) => f.item_id === null).map((f) => ({ key: `f${f.label}`, id: null, label: f.label, total: f.total }));
            setExistingSavings([...thisMonth, ...carried]);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingSavings(false);
        }
    }

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen) return;
        setStep('category'); setCategory(null); setLabel(''); setAmount(''); setPlanned(''); setError(''); setContributingId(null); setContributeAmount(''); setRepeat('once'); setCount('12');
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

    const contribute = async (item) => {
        const value = Number(contributeAmount);
        if (!(value > 0)) { setError('Escribe un monto válido'); return; }
        setSaving(true); setError('');
        try {
            // Un ahorro de un mes anterior aún no tiene fila en este mes: se crea con el mismo nombre y se suma al mismo ahorro.
            if (item.id) await post(`/budget/items/${item.id}/contribute`, 'PATCH', { amount: value });
            else await post(`/budget/${monthKey}/items`, 'POST', { section: 'saving', label: item.label, budgeted_amount: value, actual_amount: value });
            onCreated?.();
        }
        catch (err) { setError(err.message); }
        finally { setSaving(false); }
    };

    const value = Number(amount);
    // Gastos: se puede indicar lo que planeabas gastar. Si no, el plan es el propio monto (como antes).
    const plannedValue = Number(planned) > 0 ? Number(planned) : value;
    const isFixed = category?.section === 'fixed_expense';
    const mode = isFixed ? repeat : 'once';
    const canPlan = mode === 'once' && (category?.section === 'tracked_expense' || isFixed);
    const countValue = Number(count);
    const countValid = Number.isInteger(countValue) && countValue >= 2 && countValue <= 120;
    const perCuota = mode === 'installments' && countValid && value > 0 ? Math.floor(value / countValue) : 0;
    const missing = !label.trim() ? 'Escribe el nombre'
        : !(value > 0) ? 'Escribe el monto'
        : mode === 'installments' && !countValid ? 'Indica cuántas cuotas (de 2 a 120)'
        : '';

    const create = async () => {
        if (missing) return;
        setSaving(true); setError('');
        try {
            if (mode === 'monthly') await post('/budget/recurring', 'POST', { label: label.trim(), amount: value, start_month: monthKey });
            else if (mode === 'installments') await post('/budget/recurring', 'POST', { label: label.trim(), total_amount: value, months: countValue, start_month: monthKey });
            else await post(`/budget/${monthKey}/items`, 'POST', { section: category.section, label: label.trim(), budgeted_amount: canPlan ? plannedValue : value, actual_amount: value });
            onCreated?.();
        } catch (err) { setError(err.message); }
        finally { setSaving(false); }
    };

    const backToSavings = step === 'form' && category?.section === 'saving';
    const back = () => {
        setError('');
        if (backToSavings) { setStep('savings-pick'); return; }
        // Abierto desde una categoría concreta: no hay selector al que volver.
        if (fromPreset) { onClose(); return; }
        setStep('category'); setCategory(null); setContributingId(null);
    };
    const atRoot = step === 'category';
    const backCloses = atRoot || (fromPreset && !backToSavings);

    return (
        <Sheet
            isOpen={isOpen}
            onClose={atRoot ? onClose : back}
            title={atRoot ? 'Movimiento personal' : category?.label}
            closeLabel={backCloses ? 'Cancelar' : 'Atrás'}
        >
            {error && <p className="small mb-3 rounded-[12px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}

            {step === 'category' && (
                <>
                    <p className="small mb-3 px-1">Se registra en tu presupuesto de {monthLabel}.</p>
                    <div className="grid grid-cols-2 gap-3">
                        {CATEGORIES.map(({ section, label: l, hint, tile, icon: Icon, ...rest }) => (
                            <button
                                key={section}
                                type="button"
                                className={`tile ${tile} flex min-h-[140px] flex-col justify-between p-4 text-left transition-transform active:scale-[0.96]`}
                                style={{ boxShadow: '0 16px 30px -16px rgb(var(--shadow-rgb) / 0.5)' }}
                                onClick={() => pick({ section, label: l, hint, tile, icon: Icon, ...rest })}
                            >
                                <span className="bubble h-11 w-11 rounded-full" style={{ background: 'rgba(255,255,255,0.28)' }}><Icon size={24} weight="fill" /></span>
                                <span>
                                    <span className="heading block">{l}</span>
                                    <span className="block text-[13px] leading-tight opacity-95">{hint}</span>
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
                                        <div key={item.key} className="px-4 py-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="min-w-0">
                                                    <span className="body block truncate font-medium">{item.label}</span>
                                                    <span className="small block text-secondary tabular">{formatCurrency(item.total)} juntados{item.id ? '' : ' · de meses anteriores'}</span>
                                                </span>
                                                {contributingId !== item.key && (
                                                    <button type="button" className="btn btn-tinted btn-sm" onClick={() => { setContributingId(item.key); setContributeAmount(''); setError(''); }}>Abonar</button>
                                                )}
                                            </div>
                                            {contributingId === item.key && (
                                                <div className="mt-3 flex items-center gap-2">
                                                    <CurrencyInput value={contributeAmount} onChange={setContributeAmount} autoFocus className="field" />
                                                    <button type="button" className="btn btn-primary btn-sm shrink-0" disabled={saving} onClick={() => contribute(item)}>
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
                        <label htmlFor="budget-amount" className="small text-secondary">{mode === 'monthly' ? 'Monto de cada mes' : mode === 'installments' ? 'Total de la compra' : 'Monto'}</label>
                        <CurrencyInput id="budget-amount" value={amount} onChange={setAmount} autoFocus placeholder="$0" echo className="input-amount" />
                        <p className="tiny mt-1">{mode === 'once' ? `En ${monthLabel}` : `Desde ${monthLabel}`}</p>
                    </div>
                    <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={category?.placeholder || 'Descripción'} aria-label="Nombre" autoCapitalize="sentences" className="field" />
                    {isFixed && (
                        <div className="mt-3 space-y-3">
                            <div className="segmented segmented-lg" role="group" aria-label="Cada cuánto se repite">
                                <button type="button" aria-pressed={repeat === 'once'} onClick={() => setRepeat('once')}>Una vez</button>
                                <button type="button" aria-pressed={repeat === 'monthly'} onClick={() => setRepeat('monthly')}>Cada mes</button>
                                <button type="button" aria-pressed={repeat === 'installments'} onClick={() => setRepeat('installments')}>A cuotas</button>
                            </div>
                            {mode === 'installments' && (
                                <div>
                                    <label className="field-label" htmlFor="budget-count">Número de cuotas (una por mes)</label>
                                    <input id="budget-count" type="number" inputMode="numeric" min="2" max="120" value={count} onChange={(e) => setCount(e.target.value)} className="field" />
                                    {perCuota > 0 && <p className="small mt-2 px-1" style={{ color: 'var(--ink)' }}>{countValue} cuotas de {formatCurrency(perCuota)}{value % countValue !== 0 ? ' (la última ajusta la diferencia)' : ''}, la primera en {monthLabel}.</p>}
                                </div>
                            )}
                            {mode !== 'once' && (
                                <p className="small px-1">
                                    {mode === 'monthly' ? 'Aparece solo en tus gastos fijos de cada mes, sin fecha de fin.' : 'Cada cuota aparece en tus gastos fijos de su mes, hasta la última.'} Llega como pendiente: cuenta en tu caja cuando la marcas pagada.
                                </p>
                            )}
                        </div>
                    )}
                    {canPlan && (
                        <div className="mt-3">
                            <label className="field-label" htmlFor="budget-planned">Lo que planeabas gastar (opcional)</label>
                            <CurrencyInput id="budget-planned" value={planned} onChange={setPlanned} placeholder="Igual al monto" className="field" />
                        </div>
                    )}
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
