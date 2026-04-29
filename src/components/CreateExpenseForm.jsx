import { useMemo, useState, useCallback, useEffect } from 'react';
import { Plus, X, Loader2, Search, UserPlus } from 'lucide-react';
import { GlassCard } from './GlassCard';

const API_URL = 'https://expense-tracker-api-0762.onrender.com';
const TOKEN_KEY = 'splitit_jwt';

export const CreateExpenseForm = ({ isOpen, onClose, onExpenseCreated, knownUsers = [] }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [participants, setParticipants] = useState([]);
    const [participantQuery, setParticipantQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // FIX: Close modal on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

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
        setParticipantQuery('');
    }, []);

    const handleAddFromQuery = useCallback(() => {
        if (participantSuggestions.length === 1) addParticipant(participantSuggestions[0]);
    }, [participantSuggestions, addParticipant]);

    const handleRemoveParticipant = useCallback(
        (id) => setParticipants((prev) => prev.filter((p) => p.id !== id)),
        [],
    );

    const handleSubmit = useCallback(
        async (e) => {
            e.preventDefault();
            setError('');
            setIsLoading(true);
            try {
                const token = localStorage.getItem(TOKEN_KEY);
                const payload = {
                    description: description.trim(),
                    amount: Number(amount),
                    participants: participants.map((p) => Number(p.id)),
                };
                const response = await fetch(`${API_URL}/expenses`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                    },
                    body: JSON.stringify(payload),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || `Error ${response.status}`);
                setDescription('');
                setAmount('');
                setParticipants([]);
                setParticipantQuery('');
                onExpenseCreated();
                onClose();
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        },
        [description, amount, participants, onExpenseCreated, onClose],
    );

    if (!isOpen) return null;

    const canSubmit = !isLoading && description.trim() && amount && participants.length > 0;

    return (
        // FIX: backdrop click also closes the modal
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
                        <h3 className="text-2xl font-extrabold tracking-tight text-primary mt-2">Nuevo gasto</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/10"
                        aria-label="Cerrar"
                    >
                        <X size={18} className="text-secondary" />
                    </button>
                </div>

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
                            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-primary outline-none focus:border-violet-500/50 transition-all text-sm placeholder:text-secondary"
                            required
                        />
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.28em] block mb-2">
                            Monto
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-primary outline-none focus:border-violet-500/50 transition-all text-sm placeholder:text-secondary"
                            required
                            min="0"
                            step="0.01"
                        />
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
                                    className="w-full bg-white/5 border border-white/10 pl-10 pr-4 py-3.5 rounded-2xl text-primary outline-none focus:border-violet-500/50 transition-all text-sm placeholder:text-secondary"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleAddFromQuery}
                                disabled={participantSuggestions.length !== 1}
                                className="px-4 py-2 bg-violet-500 text-white rounded-2xl hover:bg-violet-600 disabled:opacity-40 transition-all font-bold text-sm shadow-lg shadow-violet-500/20 active:scale-95"
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
                                            className="px-3 py-1 rounded-full border border-violet-400/30 bg-violet-500/10 text-violet-300 text-xs font-semibold hover:bg-violet-500/20 transition-colors active:scale-95"
                                        >
                                            @{user.username || user.displayName}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Selected participants chips */}
                        {participants.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {participants.map((participant) => (
                                    <div
                                        key={participant.id}
                                        className="bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full text-sm text-violet-300 flex items-center gap-2"
                                    >
                                        <span className="truncate max-w-40">{participant.displayName}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveParticipant(participant.id)}
                                            className="text-violet-400 hover:text-violet-200 transition-colors"
                                            aria-label={`Quitar ${participant.displayName}`}
                                        >
                                            <X size={13} />
                                        </button>
                                    </div>
                                ))}
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
                            className="flex-1 text-white font-bold py-4 rounded-2xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 active:scale-[0.98]"
                            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))' }}
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                            Crear Gasto
                        </button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
};
