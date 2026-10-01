import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Search, UserPlus, Users } from 'lucide-react';
import { ScreenHeader, NavAction } from './ui/ScreenHeader';
import { Avatar } from './ui/Avatar';
import { EmptyState } from './ui/EmptyState';
import { Sheet } from './ui/Sheet';
import { API_URL } from '../config/api';
import { displayNameOf, formatCurrency } from '../utils/helpers';

const userOf = (friend) => friend?.user || friend?.friend || friend?.profile || friend || {};
const requestIdOf = (r) => r?.request_id ?? r?.friendship_id ?? r?.relation_id ?? r?.id;

const AddFriendSheet = ({ isOpen, onClose, token, onRefresh }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [sentIds, setSentIds] = useState(new Set());
    const [error, setError] = useState('');
    const [sendingId, setSendingId] = useState(null);
    const seq = useRef(0);

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (isOpen) { setQuery(''); setResults([]); setSentIds(new Set()); setError(''); }
    }, [isOpen]);

    // Búsqueda mientras escribes (con pausa de 350 ms): no hace falta
    // presionar "buscar", y las respuestas viejas no pisan a las nuevas.
    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) { setResults([]); setSearching(false); return undefined; }
        setSearching(true);
        const id = ++seq.current;
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'No se pudo buscar');
                if (id === seq.current) { setResults(Array.isArray(data?.users) ? data.users : []); setError(''); }
            } catch (err) {
                if (id === seq.current) setError(err.message);
            } finally {
                if (id === seq.current) setSearching(false);
            }
        }, 350);
        return () => clearTimeout(t);
    }, [query, token]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const send = async (userId) => {
        setSendingId(userId);
        setError('');
        try {
            const res = await fetch(`${API_URL}/friends/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Accept: 'application/json' },
                body: JSON.stringify({ user_id: Number(userId) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'No se pudo enviar la solicitud');
            setSentIds((prev) => new Set(prev).add(userId));
            onRefresh?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setSendingId(null);
        }
    };

    return (
        <Sheet isOpen={isOpen} onClose={onClose} title="Agregar amigo">
            <div className="relative">
                <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                    type="search"
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nombre, usuario, correo o teléfono"
                    aria-label="Buscar personas"
                    enterKeyHint="search"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="field"
                    style={{ paddingLeft: 44 }}
                />
            </div>

            {error && <p className="t-subhead mt-3 rounded-[12px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}

            <div className="mt-4">
                {searching && <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} /></div>}
                {!searching && query.trim().length < 2 && <p className="t-subhead px-1 py-4 text-center text-secondary">Escribe al menos 2 letras para buscar.</p>}
                {!searching && query.trim().length >= 2 && results.length === 0 && <p className="t-subhead px-1 py-4 text-center text-secondary">No encontramos a nadie con “{query.trim()}”.</p>}
                {results.length > 0 && (
                    <div className="ios-group">
                        {results.map((u) => {
                            const status = sentIds.has(u.id) ? 'pending' : u.friendship_status;
                            return (
                                <div key={u.id} className="ios-row">
                                    <Avatar name={displayNameOf(u)} size={44} />
                                    <span className="min-w-0 flex-1">
                                        <span className="t-body block truncate font-medium">{displayNameOf(u)}</span>
                                        {u.username && <span className="t-footnote block truncate text-secondary">@{u.username}</span>}
                                    </span>
                                    {status === 'accepted' ? (
                                        <span className="t-footnote text-secondary">Ya son amigos</span>
                                    ) : status === 'pending' ? (
                                        <span className="t-footnote text-secondary">Solicitud enviada</span>
                                    ) : status === 'blocked' ? (
                                        <span className="t-footnote text-secondary">No disponible</span>
                                    ) : (
                                        <button type="button" className="btn btn-tinted btn-sm" disabled={sendingId === u.id} onClick={() => send(u.id)}>
                                            {sendingId === u.id ? <Loader2 size={14} className="animate-spin" /> : <><UserPlus size={15} /> Agregar</>}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Sheet>
    );
};

export const FriendsView = ({ friends, pendingRequests, balance, token, onRefresh, isAddOpen, onAddOpenChange }) => {
    const [acceptingId, setAcceptingId] = useState(null);
    const [error, setError] = useState('');

    const netByFriend = useMemo(() => {
        const map = new Map();
        (balance?.by_friend || []).forEach((f) => map.set(f.friend_id, f.net));
        return map;
    }, [balance]);

    const accept = async (requestId) => {
        setAcceptingId(requestId);
        setError('');
        try {
            const res = await fetch(`${API_URL}/friends/${requestId}/accept`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'No se pudo aceptar');
            await onRefresh?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setAcceptingId(null);
        }
    };

    return (
        <section className="animate-fade-up">
            <ScreenHeader
                title="Amigos"
                subtitle="Con quienes compartes gastos"
                actions={<NavAction label="Agregar amigo" tint onClick={() => onAddOpenChange(true)}><Plus size={20} strokeWidth={2.4} /></NavAction>}
            />

            {error && <p className="t-subhead mb-4 rounded-[12px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}

            {pendingRequests.length > 0 && (
                <>
                    <p className="t-section px-4 pb-2">Solicitudes</p>
                    <div className="ios-group mb-6">
                        {pendingRequests.map((r) => {
                            const user = userOf(r);
                            const id = requestIdOf(r);
                            return (
                                <div key={id} className="ios-row">
                                    <Avatar name={displayNameOf(user)} size={44} />
                                    <span className="min-w-0 flex-1">
                                        <span className="t-body block truncate font-medium">{displayNameOf(user)}</span>
                                        <span className="t-footnote block text-secondary">Quiere ser tu amigo</span>
                                    </span>
                                    <button type="button" className="btn btn-primary btn-sm" disabled={acceptingId === id} onClick={() => accept(id)}>
                                        {acceptingId === id ? <Loader2 size={14} className="animate-spin" /> : 'Aceptar'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {friends.length === 0 ? (
                <EmptyState
                    icon={<Users size={26} />}
                    title="Aún no tienes amigos"
                    message="Agrégalos por nombre, usuario, correo o teléfono para empezar a dividir gastos."
                    action={<button type="button" className="btn btn-primary" onClick={() => onAddOpenChange(true)}>Agregar amigo</button>}
                />
            ) : (
                <>
                    <p className="t-section px-4 pb-2">{friends.length} {friends.length === 1 ? 'amigo' : 'amigos'}</p>
                    <div className="ios-group">
                        {friends.map((f, i) => {
                            const user = userOf(f);
                            const net = netByFriend.get(Number(user.id ?? f.user_id ?? f.friend_id)) || 0;
                            return (
                                <div key={user.id ?? f.id ?? i} className="ios-row">
                                    <Avatar name={displayNameOf(user)} size={44} />
                                    <span className="min-w-0 flex-1">
                                        <span className="t-body block truncate font-medium">{displayNameOf(user)}</span>
                                        <span className="t-footnote block truncate text-secondary">{user.username ? `@${user.username}` : user.email}</span>
                                    </span>
                                    <span className="shrink-0 text-right">
                                        {Math.abs(net) > 0.5 ? (
                                            <>
                                                <span className="t-caption block" style={{ color: net > 0 ? 'var(--success)' : 'var(--danger)' }}>{net > 0 ? 'te debe' : 'le debes'}</span>
                                                <span className="t-headline tabular block" style={{ color: net > 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(Math.abs(net))}</span>
                                            </>
                                        ) : (
                                            <span className="t-footnote text-secondary">Al día</span>
                                        )}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            <AddFriendSheet isOpen={isAddOpen} onClose={() => onAddOpenChange(false)} token={token} onRefresh={onRefresh} />
        </section>
    );
};
