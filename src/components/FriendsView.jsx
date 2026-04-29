import { useMemo, useState, useEffect } from 'react';
import { CheckCircle2, Loader2, RefreshCw, Search, UserPlus, Users, X } from 'lucide-react';
import { GlassCard } from './GlassCard';

const API_URL = 'https://expense-tracker-api-0762.onrender.com';

const getFriendUser = (friend) => friend?.user || friend?.friend || friend?.profile || friend || {};

const getDisplayName = (user) => {
    const parts = [user?.first_name, user?.middle_name, user?.last_name, user?.second_last_name]
        .map((part) => (typeof part === 'string' ? part.trim() : ''))
        .filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
    if (user?.username) return user.username;
    if (user?.email) return user.email;
    return 'Usuario sin nombre';
};

const getFriendStatus = (friend) => friend?.status || friend?.friendship_status || 'accepted';
const getFriendKey = (friend, index) => friend?.id ?? friend?.user_id ?? friend?.friend_id ?? index;
const getRequestUser = (request) => request?.requester || request?.from_user || request?.user || request;
const getRequestId = (request) => request?.request_id ?? request?.friendship_id ?? request?.relation_id ?? request?.id;

// FIX: was using hardcoded text-white/* classes which broke light theme.
// Now uses text-primary / text-secondary CSS variables consistently.
const FriendRow = ({ friend, theme }) => {
    const user = getFriendUser(friend);
    const status = getFriendStatus(friend);
    const subtitleParts = [user?.username, user?.email, user?.phone].filter(Boolean);

    return (
        <div
            className="rounded-3xl p-4 flex items-center justify-between gap-4 border border-white/10 transition-all hover:bg-white/5"
            style={{ background: 'var(--surface-soft)' }}
        >
            <div className="min-w-0">
                <p className="text-sm font-semibold text-primary truncate">{getDisplayName(user)}</p>
                <p className="text-xs text-secondary truncate">{subtitleParts.join(' · ')}</p>
            </div>
            <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                {status}
            </span>
        </div>
    );
};

export const FriendsView = ({ friends = [], pendingRequests = [], token, onRefresh, isLoading, theme = 'dark' }) => {
    const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [requestingUserId, setRequestingUserId] = useState(null);
    const [acceptingRequestId, setAcceptingRequestId] = useState(null);
    const [localMessage, setLocalMessage] = useState('');

    const hasFriends = useMemo(() => friends.length > 0, [friends]);
    const hasPendingRequests = useMemo(() => pendingRequests.length > 0, [pendingRequests]);

    // FIX: Close modal with Escape key
    useEffect(() => {
        if (!isAddFriendOpen) return;
        const handler = (e) => { if (e.key === 'Escape') setIsAddFriendOpen(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isAddFriendOpen]);

    const openAddFriend = () => {
        setIsAddFriendOpen(true);
        setSearchTerm('');
        setSearchResults([]);
        setLocalMessage('');
    };

    const searchUsers = async (event) => {
        event.preventDefault();
        const query = searchTerm.trim();
        if (!query || !token) return;
        setSearchLoading(true);
        setLocalMessage('');
        try {
            const response = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(query)}`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'No se pudo buscar usuarios');
            const users = Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];
            setSearchResults(users.filter((user) => Number(user?.id) > 0));
        } catch (error) {
            setLocalMessage(error.message);
        } finally {
            setSearchLoading(false);
        }
    };

    const requestFriend = async (userId) => {
        if (!token || !userId) return;
        setRequestingUserId(userId);
        setLocalMessage('');
        try {
            const response = await fetch(`${API_URL}/friends/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Accept: 'application/json' },
                body: JSON.stringify({ user_id: Number(userId) })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'No se pudo enviar la solicitud');
            setLocalMessage(data.message || 'Solicitud enviada');
            await onRefresh?.();
        } catch (error) {
            setLocalMessage(error.message);
        } finally {
            setRequestingUserId(null);
        }
    };

    const acceptRequest = async (requestId) => {
        if (!token || !requestId) return;
        setAcceptingRequestId(requestId);
        setLocalMessage('');
        try {
            const response = await fetch(`${API_URL}/friends/${requestId}/accept`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'No se pudo aceptar la solicitud');
            setLocalMessage(data.message || 'Solicitud aceptada');
            await onRefresh?.();
        } catch (error) {
            setLocalMessage(error.message);
        } finally {
            setAcceptingRequestId(null);
        }
    };

    return (
        <section className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between px-2">
                <div>
                    <h3 className="text-lg font-bold text-primary">Amigos</h3>
                    <p className="text-xs text-secondary">
                        {friends.length} contacto{friends.length !== 1 ? 's' : ''}
                        {hasPendingRequests ? ` · ${pendingRequests.length} pendiente${pendingRequests.length !== 1 ? 's' : ''}` : ''}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isLoading && <Loader2 size={16} className="animate-spin text-secondary" />}
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={isLoading}
                        className="p-2 rounded-full transition-all disabled:opacity-50"
                        style={{ background: 'var(--surface-soft)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}
                        aria-label="Refrescar"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={openAddFriend}
                        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
                        style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))', boxShadow: '0 8px 20px -8px rgba(139,92,246,0.55)' }}
                    >
                        <UserPlus size={14} />
                        Añadir
                    </button>
                </div>
            </div>

            {/* Pending requests — shown prominently at the top when present */}
            {hasPendingRequests && (
                <section className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-secondary px-2">
                        Solicitudes pendientes
                    </p>
                    {pendingRequests.map((request, index) => {
                        const user = getRequestUser(request);
                        const requestId = getRequestId(request);
                        const disabled = !requestId || acceptingRequestId === requestId;

                        return (
                            <GlassCard key={requestId ?? index} theme={theme} className="p-4 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-primary truncate">{getDisplayName(user)}</p>
                                    <p className="text-xs text-secondary truncate">
                                        {[user?.username, user?.email, user?.phone].filter(Boolean).join(' · ')}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => acceptRequest(requestId)}
                                    disabled={disabled}
                                    className={`shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                                        disabled
                                            ? 'bg-white/5 text-secondary border border-white/10 cursor-not-allowed'
                                            : 'bg-emerald-500 text-white hover:bg-emerald-400 active:scale-95'
                                    }`}
                                >
                                    {acceptingRequestId === requestId
                                        ? <Loader2 size={14} className="animate-spin" />
                                        : <CheckCircle2 size={14} />}
                                    {requestId ? 'Aceptar' : 'Sin ID'}
                                </button>
                            </GlassCard>
                        );
                    })}
                </section>
            )}

            {/* Friends list */}
            {hasFriends ? (
                <section className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-secondary px-2">Contactos</p>
                    <div className="space-y-2">
                        {friends.map((friend, index) => (
                            <FriendRow key={getFriendKey(friend, index)} friend={friend} theme={theme} />
                        ))}
                    </div>
                </section>
            ) : (
                <GlassCard theme={theme} className="py-14 px-6 text-center space-y-4 flex flex-col items-center">
                    <div
                        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/10"
                        style={{ background: 'var(--surface-soft)', color: 'var(--text-secondary)' }}
                    >
                        <Users size={24} />
                    </div>
                    <div>
                        <h4 className="text-base font-semibold text-primary">Todavía no tienes amigos</h4>
                        <p className="text-sm text-secondary mt-1">Búscalos por email, usuario o nombre.</p>
                    </div>
                    <button
                        type="button"
                        onClick={openAddFriend}
                        className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                        style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))', boxShadow: '0 10px 24px -10px rgba(139,92,246,0.55)' }}
                    >
                        <UserPlus size={16} />
                        Añadir amigo
                    </button>
                </GlassCard>
            )}

            {/* Add Friend Modal */}
            {isAddFriendOpen && (
                <div
                    className="fixed inset-0 z-90 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 sm:p-6"
                    onClick={(e) => { if (e.target === e.currentTarget) setIsAddFriendOpen(false); }}
                    role="presentation"
                >
                    <div className="w-full max-w-xl rounded-4xl border border-white/10 shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        style={{ background: 'var(--surface-strong)' }}
                    >
                        {/* Modal header */}
                        <div className="border-b border-white/10 px-5 py-4 flex items-center justify-between gap-4">
                            <div>
                                <h4 className="text-lg font-bold text-primary">Añadir amigo</h4>
                                <p className="text-xs text-secondary">Busca por usuario, nombre, email o teléfono.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddFriendOpen(false)}
                                className="h-9 w-9 rounded-full flex items-center justify-center border border-white/10 bg-white/5 text-secondary hover:text-primary hover:bg-white/10 transition-all"
                                aria-label="Cerrar"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Search form */}
                        <form onSubmit={searchUsers} className="space-y-4 px-5 py-5">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={16} />
                                <input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar usuario…"
                                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-primary outline-none transition-all placeholder:text-secondary focus:border-violet-400/50"
                                    autoFocus
                                />
                            </div>

                            {localMessage && (
                                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-secondary">
                                    {localMessage}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={searchLoading || !searchTerm.trim()}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))' }}
                            >
                                {searchLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                Buscar
                            </button>
                        </form>

                        {/* Results */}
                        <div className="max-h-72 space-y-3 overflow-y-auto px-5 pb-5">
                            {searchResults.length === 0 ? (
                                <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-secondary">
                                    No hay resultados para mostrar.
                                </p>
                            ) : (
                                searchResults.map((user) => {
                                    const alreadyLinked = user?.friendship_status && user.friendship_status !== 'none';
                                    const requestDisabled = alreadyLinked || requestingUserId === user.id;
                                    return (
                                        <div
                                            key={user.id}
                                            className="rounded-3xl border border-white/10 p-4 flex items-start justify-between gap-4"
                                            style={{ background: 'var(--surface-soft)' }}
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-primary truncate">{getDisplayName(user)}</p>
                                                <p className="text-xs text-secondary truncate">
                                                    {[user?.username, user?.email, user?.phone].filter(Boolean).join(' · ')}
                                                </p>
                                                {user?.friendship_status && user.friendship_status !== 'none' && (
                                                    <p className="mt-1.5 text-[10px] uppercase tracking-[0.24em] text-secondary">
                                                        {user.friendship_status}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => requestFriend(user.id)}
                                                disabled={requestDisabled}
                                                className={`shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                                                    requestDisabled
                                                        ? 'bg-white/5 text-secondary border border-white/10 cursor-not-allowed'
                                                        : 'bg-emerald-500 text-white hover:bg-emerald-400 active:scale-95'
                                                }`}
                                            >
                                                {requestingUserId === user.id
                                                    ? <Loader2 size={14} className="animate-spin" />
                                                    : <UserPlus size={14} />}
                                                {alreadyLinked ? 'Ya vinculado' : 'Agregar'}
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-white/10 px-5 py-4 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsAddFriendOpen(false)}
                                className="rounded-full px-4 py-2 text-sm font-semibold text-secondary hover:text-primary transition-all"
                                style={{ background: 'var(--surface-soft)' }}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};
