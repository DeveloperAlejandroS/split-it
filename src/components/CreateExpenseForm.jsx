import { useMemo, useState, useCallback, useEffect } from 'react';
import { Plus, X, Loader2, Search, UserPlus, SlidersHorizontal } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { ConfirmDialog } from './ConfirmDialog';
import { API_URL } from '../config/api';
import { formatCurrency, getParticipantStatus, numberOrZero } from '../utils/helpers';
import { previewEqualSplit, sumCustomAmounts } from '../utils/splitPreview';

const TOKEN_KEY = 'splitit_jwt';

export const CreateExpenseForm = ({
    isOpen,
    onClose,
    onSuccess,
    knownUsers = [],
    currentUserId,
    mode = 'create', // 'create' | 'edit'
    initialExpense = null,
}) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [splitType, setSplitType] = useState('equal'); // 'equal' | 'custom'
    const [participants, setParticipants] = useState([]);
    const [customAmounts, setCustomAmounts] = useState({}); // { [userId]: string }
    const [participantQuery, setParticipantQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showResetWarning, setShowResetWarning] = useState(false);

    const isEdit = mode === 'edit' && initialExpense;

    const normalizedKnownUsers = useMemo(() => {
        return knownUsers
            .filter((user) => Number(user?.id) > 0)
            .map((user) => ({
                id: Number(user.id),
                username: String(user?.username || '').trim(),
                email: String(user?.email || '').trim(),
                phone: String(user?.phone || '').trim(),
                displayName:
                    String(user?.displayName || '').trim() ||
                    String(user?.username || '').trim() ||
                    String(user?.email || '').trim(),
            }));
    }, [knownUsers]);

    const knownUsersById = useMemo(() => {
        const map = new Map();
        normalizedKnownUsers.forEach((u) => map.set(u.id, u));
        return map;
    }, [normalizedKnownUsers]);

    // Reinicia (create) o precarga (edit) el formulario cada vez que se abre.
    // Sincroniza el form con `initialExpense` solo en la transición isOpen/expense (deps abajo), no en cada render.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen) return;

        if (isEdit) {
            const otherParticipants = (initialExpense.participants || []).filter(
                (p) => Number(p.user_id) !== Number(currentUserId),
            );

            setDescription(initialExpense.description || '');
            setAmount(String(numberOrZero(initialExpense.amount)));
            setSplitType('custom');
            setParticipants(
                otherParticipants.map((p) => {
                    const known = knownUsersById.get(Number(p.user_id));
                    return known || {
                        id: Number(p.user_id),
                        username: '',
                        email: p.email || '',
                        phone: '',
                        displayName: p.email || `Usuario ${p.user_id}`,
                    };
                }),
            );
            const amounts = {};
            otherParticipants.forEach((p) => {
                amounts[p.user_id] = String(numberOrZero(p.amount_owed));
            });
            setCustomAmounts(amounts);
        } else {
            setDescription('');
            setAmount('');
            setSplitType('equal');
            setParticipants([]);
            setCustomAmounts({});
        }

        setParticipantQuery('');
        setError('');
        setShowResetWarning(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, isEdit, initialExpense?.id]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const hasPaymentsToReset = useMemo(() => {
        if (!isEdit) return false;
        return (initialExpense.participants || [])
            .filter((p) => Number(p.user_id) !== Number(currentUserId))
            .some((p) => getParticipantStatus(p) !== 'pending');
    }, [isEdit, initialExpense, currentUserId]);

    const selectedParticipantIds = useMemo(
        () => new Set(participants.map((p) => p.id)),
        [participants],
    );

    const participantSuggestions = useMemo(() => {
        const query = participantQuery.trim().toLowerCase();
        if (!query) return [];
        return normalizedKnownUsers
            .filter((user) => !selectedParticipantIds.has(user.id))
            .filter((user) => {
                const haystack = [user.username, user.email, user.phone, user.displayName]
                    .map((v) => String(v || '').toLowerCase())
                    .join(' ');
                return haystack.includes(query);
            })
            .slice(0, 8);
    }, [participantQuery, normalizedKnownUsers, selectedParticipantIds]);

    const friendRecommendations = useMemo(
        () => normalizedKnownUsers.filter((u) => !selectedParticipantIds.has(u.id)).slice(0, 10),
        [normalizedKnownUsers, selectedParticipantIds],
    );

    const addParticipant = useCallback((user) => {
        if (!user || !Number(user?.id)) return;
        setParticipants((prev) => {
            if (prev.some((p) => p.id === user.id)) return prev;
            return [...prev, user];
        });
        setCustomAmounts((prev) => (prev[user.id] !== undefined ? prev : { ...prev, [user.id]: '' }));
        setParticipantQuery('');
    }, []);

    const handleAddFromQuery = useCallback(() => {
        if (participantSuggestions.length === 1) addParticipant(participantSuggestions[0]);
    }, [participantSuggestions, addParticipant]);

    const handleRemoveParticipant = useCallback((id) => {
        setParticipants((prev) => prev.filter((p) => p.id !== id));
        setCustomAmounts((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    }, []);

    const setCustomAmountFor = useCallback((id, value) => {
        setCustomAmounts((prev) => ({ ...prev, [id]: value }));
    }, []);

    // --- Previews ---
    const amountNumber = Number(amount) || 0;

    const equalPreview = useMemo(
        () => (splitType === 'equal' ? previewEqualSplit(amountNumber, participants.length + 1) : null),
        [splitType, amountNumber, participants.length],
    );

    const customOthersTotal = useMemo(
        () => (splitType === 'custom' ? sumCustomAmounts(participants.map((p) => customAmounts[p.id])) : 0),
        [splitType, participants, customAmounts],
    );
    const customPayerShare = amountNumber - customOthersTotal;
    const customOverBudget = splitType === 'custom' && customOthersTotal > amountNumber;

    const submitPayload = () => {
        if (splitType === 'custom') {
            return {
                description: description.trim(),
                amount: amountNumber,
                split_type: 'custom',
                participants: participants.map((p) => ({
                    user_id: Number(p.id),
                    amount: Number(customAmounts[p.id]) || 0,
                })),
            };
        }
        return {
            description: description.trim(),
            amount: amountNumber,
            split_type: 'equal',
            participants: participants.map((p) => Number(p.id)),
        };
    };

    const doSubmit = useCallback(async () => {
        setError('');
        setIsLoading(true);
        try {
            const token = localStorage.getItem(TOKEN_KEY);
            const url = isEdit ? `${API_URL}/expenses/${initialExpense.id}` : `${API_URL}/expenses`;
            const response = await fetch(url, {
                method: isEdit ? 'PATCH' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
                body: JSON.stringify(submitPayload()),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || `Error ${response.status}`);
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
            setShowResetWarning(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [description, amount, splitType, participants, customAmounts, isEdit, initialExpense, onSuccess, onClose]);

    const handleSubmit = useCallback(
        (e) => {
            e.preventDefault();
            if (isEdit && hasPaymentsToReset) {
                setShowResetWarning(true);
                return;
            }
            doSubmit();
        },
        [isEdit, hasPaymentsToReset, doSubmit],
    );

    if (!isOpen) return null;

    const canSubmit =
        !isLoading &&
        description.trim() &&
        amountNumber > 0 &&
        participants.length > 0 &&
        (splitType === 'equal' || (!customOverBudget && participants.every((p) => Number(customAmounts[p.id]) > 0)));

    return (
        <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-3xl z-65 flex items-center justify-center px-4 sm:px-8 py-6"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            role="presentation"
        >
            <GlassCard
                className="relative w-full max-w-2xl rounded-4xl p-6 sm:p-7 border border-white/10 animate-in fade-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh] overflow-y-auto"
                theme="dark"
            >
                <div className="absolute inset-0 bg-linear-to-br from-white/8 via-transparent to-transparent pointer-events-none" />

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.28em]">
                            Command Action
                        </p>
                        <h3 className="text-2xl font-extrabold tracking-tight text-primary mt-2">
                            {isEdit ? 'Editar gasto' : 'Nuevo gasto'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/10"
                        aria-label="Cerrar"
                    >
                        <X size={18} className="text-secondary" />
                    </button>
                </div>

                {isEdit && hasPaymentsToReset && (
                    <div
                        className="mb-4 p-3 rounded-2xl text-sm text-primary"
                        style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)' }}
                    >
                        Este gasto ya tiene pagos registrados. Guardar cambios reiniciará el estado de pago de todos los participantes a pendiente.
                    </div>
                )}

                {error && (
                    <div
                        className="mb-4 p-3 rounded-2xl text-sm text-primary"
                        style={{ background: 'rgba(244,63,94,0.10)', border: '1px solid rgba(244,63,94,0.20)' }}
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Description */}
                    <div>
                        <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.28em] block mb-2">
                            Descripción
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Cena, Uber, mercado…"
                            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-primary outline-none focus:border-(--accent)/50 transition-all text-sm placeholder:text-secondary"
                            required
                        />
                    </div>

                    {/* Amount */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.28em]">
                                Monto
                            </label>
                            <button
                                type="button"
                                onClick={() => setSplitType((t) => (t === 'equal' ? 'custom' : 'equal'))}
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] transition-all ${
                                    splitType === 'custom'
                                        ? 'bg-(--accent-soft) text-(--accent) border border-(--accent)/30'
                                        : 'bg-white/5 text-secondary border border-white/10 hover:text-primary'
                                }`}
                            >
                                <SlidersHorizontal size={11} />
                                División personalizada
                            </button>
                        </div>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-primary outline-none focus:border-(--accent)/50 transition-all text-sm placeholder:text-secondary"
                            required
                            min="0"
                            step="0.01"
                        />

                        {splitType === 'equal' && equalPreview && participants.length > 0 && (
                            <p className="text-xs text-secondary mt-2">
                                Cada persona paga {formatCurrency(equalPreview.baseAmount)}
                                {equalPreview.peopleWithExtraCent > 0
                                    ? ` (${equalPreview.peopleWithExtraCent} de ${participants.length + 1} pagan ${formatCurrency(equalPreview.extraAmount)})`
                                    : ''}
                            </p>
                        )}

                        {splitType === 'custom' && participants.length > 0 && (
                            <p className={`text-xs mt-2 ${customOverBudget ? 'text-rose-400' : 'text-secondary'}`}>
                                Tu parte (calculada): {formatCurrency(Math.max(customPayerShare, 0))}
                                {customOverBudget ? ' — la suma de participantes supera el total' : ''}
                            </p>
                        )}
                    </div>

                    {/* Participants */}
                    <div>
                        <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.28em] block mb-2">
                            Participantes
                        </label>

                        {/* Search row */}
                        <div className="flex gap-2 mb-3">
                            <div className="flex-1 relative">
                                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
                                <input
                                    type="text"
                                    value={participantQuery}
                                    onChange={(e) => setParticipantQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddFromQuery();
                                        }
                                    }}
                                    placeholder="Buscar por usuario, correo o teléfono"
                                    className="w-full bg-white/5 border border-white/10 pl-10 pr-4 py-3.5 rounded-2xl text-primary outline-none focus:border-(--accent)/50 transition-all text-sm placeholder:text-secondary"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleAddFromQuery}
                                disabled={participantSuggestions.length !== 1}
                                className="px-4 py-2 bg-(--accent) text-(--accent-contrast) rounded-2xl hover:brightness-95 disabled:opacity-40 transition-all font-bold text-sm shadow-lg shadow-(--accent)/20 active:scale-95"
                                aria-label="Añadir participante"
                            >
                                <UserPlus size={16} />
                            </button>
                        </div>

                        {/* Dropdown suggestions */}
                        {participantQuery.trim() && (
                            <div className="mb-3 max-h-48 overflow-y-auto rounded-2xl border border-white/10 bg-white/5">
                                {participantSuggestions.length > 0 ? (
                                    participantSuggestions.map((user) => (
                                        <button
                                            key={user.id}
                                            type="button"
                                            onClick={() => addParticipant(user)}
                                            className="w-full px-4 py-3 text-left border-b border-white/5 last:border-b-0 hover:bg-white/10 transition-colors"
                                        >
                                            <p className="text-sm text-primary font-semibold truncate">
                                                {user.displayName}
                                            </p>
                                            <p className="text-xs text-secondary truncate">
                                                {[user.username, user.email, user.phone].filter(Boolean).join(' · ')}
                                            </p>
                                        </button>
                                    ))
                                ) : (
                                    <p className="px-4 py-3 text-xs text-secondary">Sin resultados.</p>
                                )}
                            </div>
                        )}

                        {/* Friend recommendations */}
                        {friendRecommendations.length > 0 && (
                            <div className="mb-3">
                                <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] mb-2">
                                    Recomendados
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {friendRecommendations.map((user) => (
                                        <button
                                            key={`rec-${user.id}`}
                                            type="button"
                                            onClick={() => addParticipant(user)}
                                            className="px-3 py-1 rounded-full border border-(--accent)/30 bg-(--accent-soft) text-(--accent) text-xs font-semibold hover:bg-(--accent-soft) transition-colors active:scale-95"
                                        >
                                            @{user.username || user.displayName}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Selected participants */}
                        {participants.length > 0 && (
                            <div className={splitType === 'custom' ? 'space-y-2 pt-1' : 'flex flex-wrap gap-2 pt-1'}>
                                {participants.map((participant) =>
                                    splitType === 'custom' ? (
                                        <div
                                            key={participant.id}
                                            className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2"
                                        >
                                            <span className="flex-1 text-sm text-primary truncate">{participant.displayName}</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={customAmounts[participant.id] ?? ''}
                                                onChange={(e) => setCustomAmountFor(participant.id, e.target.value)}
                                                placeholder="Monto"
                                                className="w-28 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-primary outline-none focus:border-(--accent)/50"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveParticipant(participant.id)}
                                                className="text-secondary hover:text-primary transition-colors"
                                                aria-label={`Quitar ${participant.displayName}`}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div
                                            key={participant.id}
                                            className="bg-(--accent-soft) border border-(--accent)/25 px-3 py-1 rounded-full text-sm text-(--accent) flex items-center gap-2"
                                        >
                                            <span className="truncate max-w-40">{participant.displayName}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveParticipant(participant.id)}
                                                className="text-(--accent) hover:brightness-125 transition-colors"
                                                aria-label={`Quitar ${participant.displayName}`}
                                            >
                                                <X size={13} />
                                            </button>
                                        </div>
                                    ),
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-white/5 border border-white/10 text-primary font-bold py-4 rounded-2xl hover:bg-white/10 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="flex-1 text-white font-bold py-4 rounded-2xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-(--accent)/20 active:scale-[0.98]"
                            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))' }}
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                            {isEdit ? 'Guardar cambios' : 'Crear Gasto'}
                        </button>
                    </div>
                </form>
            </GlassCard>

            <ConfirmDialog
                isOpen={showResetWarning}
                tone="warning"
                title="¿Reiniciar estados de pago?"
                message="Este gasto tiene pagos ya confirmados o esperando confirmación. Guardar los cambios los reiniciará a pendiente para todos los participantes."
                confirmLabel="Confirmar y reiniciar pagos"
                cancelLabel="Volver"
                isLoading={isLoading}
                onConfirm={doSubmit}
                onCancel={() => setShowResetWarning(false)}
            />
        </div>
    );
};
