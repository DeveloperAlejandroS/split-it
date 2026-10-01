import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Sheet } from './ui/Sheet';
import { Avatar } from './ui/Avatar';
import { EmptyState } from './ui/EmptyState';
import { ConfirmDialog } from './ConfirmDialog';
import { CurrencyInput } from './CurrencyInput';
import { API_URL } from '../config/api';
import { formatCurrency, getParticipantStatus, numberOrZero } from '../utils/helpers';
import { previewEqualSplit, sumCustomAmounts } from '../utils/splitPreview';

const TOKEN_KEY = 'splitit_jwt';

// Detecta si un gasto existente se repartió en partes iguales, para que al
// editar vuelva a abrirse en "Partes iguales" (antes siempre caía en
// "Personalizado" y asustaba con montos que el usuario nunca escribió).
const looksEqual = (total, otherAmounts) => {
    if (otherAmounts.length === 0) return true;
    const base = total / (otherAmounts.length + 1);
    return otherAmounts.every((a) => Math.abs(a - base) <= 1);
};

export const CreateExpenseSheet = ({
    isOpen,
    onClose,
    onSuccess,
    friendUsers = [],
    currentUserId,
    initialExpense = null,
    onGoToFriends,
}) => {
    const isEdit = Boolean(initialExpense);

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [splitType, setSplitType] = useState('equal');
    const [selected, setSelected] = useState([]); // ids
    const [customAmounts, setCustomAmounts] = useState({});
    const [query, setQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [showResetWarning, setShowResetWarning] = useState(false);

    const friendsById = useMemo(() => new Map(friendUsers.map((f) => [f.id, f])), [friendUsers]);

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen) return;
        setQuery('');
        setError('');
        setShowResetWarning(false);
        if (initialExpense) {
            const others = (initialExpense.participants || []).filter((p) => numberOrZero(p.user_id) !== numberOrZero(currentUserId));
            const total = numberOrZero(initialExpense.amount);
            setDescription(initialExpense.description || '');
            setAmount(String(total));
            setSelected(others.map((p) => p.user_id));
            const amounts = {};
            others.forEach((p) => { amounts[p.user_id] = String(numberOrZero(p.amount_owed)); });
            setCustomAmounts(amounts);
            setSplitType(looksEqual(total, others.map((p) => numberOrZero(p.amount_owed))) ? 'equal' : 'custom');
        } else {
            setDescription('');
            setAmount('');
            setSelected([]);
            setCustomAmounts({});
            setSplitType('equal');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialExpense?.id]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const hasPaymentsToReset = useMemo(() => {
        if (!initialExpense) return false;
        return (initialExpense.participants || [])
            .filter((p) => numberOrZero(p.user_id) !== numberOrZero(currentUserId))
            .some((p) => getParticipantStatus(p) !== 'pending');
    }, [initialExpense, currentUserId]);

    const toggle = (id) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
        setCustomAmounts((prev) => (prev[id] !== undefined ? prev : { ...prev, [id]: '' }));
    };

    const amountNumber = Number(amount) || 0;
    const equal = useMemo(() => previewEqualSplit(amountNumber, selected.length + 1), [amountNumber, selected.length]);
    const customOthersTotal = useMemo(() => sumCustomAmounts(selected.map((id) => customAmounts[id])), [selected, customAmounts]);
    const myCustomShare = amountNumber - customOthersTotal;
    const customOver = splitType === 'custom' && customOthersTotal > amountNumber + 0.001;

    // Qué falta para poder guardar -- se dice en voz alta en vez de dejar el
    // botón apagado sin explicación.
    const missing = (() => {
        if (amountNumber <= 0) return 'Escribe el monto';
        if (!description.trim()) return 'Dile qué fue';
        if (selected.length === 0) return 'Elige con quién lo compartes';
        if (splitType === 'custom') {
            if (!selected.every((id) => Number(customAmounts[id]) > 0)) return 'Falta el monto de alguien';
            if (customOver) return 'La suma supera el total';
        }
        return '';
    })();

    const payload = () => ({
        description: description.trim(),
        amount: amountNumber,
        split_type: splitType,
        participants: splitType === 'custom'
            ? selected.map((id) => ({ user_id: Number(id), amount: Number(customAmounts[id]) || 0 }))
            : selected.map((id) => Number(id)),
    });

    const doSubmit = useCallback(async () => {
        setError('');
        setIsSaving(true);
        try {
            const token = localStorage.getItem(TOKEN_KEY);
            const response = await fetch(isEdit ? `${API_URL}/expenses/${initialExpense.id}` : `${API_URL}/expenses`, {
                method: isEdit ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Accept: 'application/json' },
                body: JSON.stringify(payload()),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || `Error ${response.status}`);
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
            setShowResetWarning(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [description, amount, splitType, selected, customAmounts, isEdit, initialExpense, onSuccess, onClose]);

    const submit = () => {
        if (missing) return;
        if (isEdit && hasPaymentsToReset) setShowResetWarning(true);
        else doSubmit();
    };

    const filteredFriends = friendUsers.filter((f) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return [f.displayName, f.username, f.email].some((v) => String(v || '').toLowerCase().includes(q));
    });

    return (
        <>
            <Sheet isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar gasto' : 'Nuevo gasto'} size="lg">
                {/* Monto: el dato principal, grande y al centro (como Apple Pay) */}
                <div className="py-4 text-center">
                    <label htmlFor="expense-amount" className="t-footnote text-secondary">¿Cuánto pagaste?</label>
                    <CurrencyInput
                        id="expense-amount"
                        value={amount}
                        onChange={setAmount}
                        autoFocus={!isEdit}
                        placeholder="$0"
                        echo className="input-amount"
                    />
                </div>

                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="¿Qué fue? Cena, Uber, mercado…"
                    aria-label="Descripción"
                    enterKeyHint="next"
                    autoCapitalize="sentences"
                    className="field"
                />

                {isEdit && hasPaymentsToReset && (
                    <p className="t-footnote mt-3 rounded-[12px] p-3" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                        Este gasto ya tiene pagos. Si cambias monto o personas, los pagos vuelven a pendiente.
                    </p>
                )}

                <p className="t-section px-4 pb-2 pt-6">Con quién</p>
                {friendUsers.length === 0 ? (
                    <EmptyState
                        title="Primero agrega amigos"
                        message="Los gastos se comparten con tus amigos en Split.it. Agrega a alguien y vuelve."
                        action={<button type="button" className="btn btn-primary" onClick={() => { onClose(); onGoToFriends?.(); }}>Ir a Amigos</button>}
                    />
                ) : (
                    <>
                        {friendUsers.length > 6 && (
                            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar amigo" aria-label="Buscar amigo" className="field mb-3" />
                        )}
                        <div className="ios-group">
                            {filteredFriends.map((f) => {
                                const on = selected.includes(f.id);
                                return (
                                    <button key={f.id} type="button" className="ios-row" role="checkbox" aria-checked={on} onClick={() => toggle(f.id)}>
                                        <Avatar name={f.displayName} size={40} />
                                        <span className="min-w-0 flex-1">
                                            <span className="t-body block truncate font-medium">{f.displayName}</span>
                                            {f.username && <span className="t-footnote block truncate text-secondary">@{f.username}</span>}
                                        </span>
                                        <span
                                            className="flex h-6 w-6 items-center justify-center rounded-full transition-all"
                                            style={{
                                                background: on ? 'var(--accent)' : 'transparent',
                                                border: on ? '0' : '1.5px solid var(--fill-2)',
                                                transform: on ? 'scale(1)' : 'scale(0.96)',
                                            }}
                                        >
                                            {on && <Check size={15} color="#fff" strokeWidth={3} />}
                                        </span>
                                    </button>
                                );
                            })}
                            {filteredFriends.length === 0 && <p className="t-subhead px-4 py-4 text-secondary">Nadie coincide con “{query}”.</p>}
                        </div>
                    </>
                )}

                {selected.length > 0 && (
                    <>
                        <p className="t-section px-4 pb-2 pt-6">Cómo se divide</p>
                        <div className="segmented" role="group" aria-label="Tipo de división">
                            <button type="button" aria-pressed={splitType === 'equal'} onClick={() => setSplitType('equal')}>Partes iguales</button>
                            <button type="button" aria-pressed={splitType === 'custom'} onClick={() => setSplitType('custom')}>Personalizado</button>
                        </div>

                        {splitType === 'equal' ? (
                            <p className="t-subhead mt-3 px-1 text-secondary">
                                {amountNumber > 0
                                    ? `Cada uno de los ${selected.length + 1} paga ${formatCurrency(equal.baseAmount)}.`
                                    : `Entre ${selected.length + 1} personas, incluyéndote.`}
                                {equal.peopleWithExtraCent > 0 ? ' (Se reparte el redondeo.)' : ''}
                            </p>
                        ) : (
                            <>
                                <div className="ios-group mt-3">
                                    {selected.map((id) => (
                                        <div key={id} className="ios-row">
                                            <Avatar name={friendsById.get(id)?.displayName} size={36} />
                                            <span className="t-body min-w-0 flex-1 truncate">{friendsById.get(id)?.displayName}</span>
                                            <CurrencyInput
                                                value={customAmounts[id] ?? ''}
                                                onChange={(v) => setCustomAmounts((prev) => ({ ...prev, [id]: v }))}
                                                placeholder="$0"
                                                className="field"
                                                style={{ width: 130, height: 40, textAlign: 'right' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <p className="t-subhead mt-3 px-1" style={{ color: customOver ? 'var(--danger)' : 'var(--text-secondary)' }}>
                                    {customOver ? 'La suma supera el total del gasto.' : `Tu parte: ${formatCurrency(Math.max(myCustomShare, 0))}`}
                                </p>
                            </>
                        )}
                    </>
                )}

                {error && <p className="t-subhead mt-4 rounded-[12px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}

                <div className="mt-6">
                    <button type="button" className="btn btn-primary btn-block" disabled={Boolean(missing) || isSaving} onClick={submit}>
                        {isSaving ? <Loader2 size={20} className="animate-spin" /> : isEdit ? 'Guardar cambios' : 'Crear gasto'}
                    </button>
                    {missing && <p className="t-footnote mt-2 text-center text-secondary">{missing}</p>}
                </div>
            </Sheet>

            <ConfirmDialog
                isOpen={showResetWarning}
                tone="default"
                title="¿Reiniciar los pagos?"
                message="Este gasto ya tiene pagos. Guardar estos cambios los vuelve a pendiente para todos."
                confirmLabel="Guardar"
                isLoading={isSaving}
                onConfirm={doSubmit}
                onCancel={() => setShowResetWarning(false)}
            />
        </>
    );
};
