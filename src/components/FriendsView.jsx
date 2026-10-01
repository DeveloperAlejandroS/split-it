import { useEffect, useMemo, useRef, useState } from 'react';
import { CaretRight, CircleNotch, Plus, MagnifyingGlass, UserMinus, UserPlus, UsersThree } from '@phosphor-icons/react';
import { ScreenHeader, NavAction } from './ui/ScreenHeader';
import { Avatar } from './ui/Avatar';
import { EmptyState } from './ui/EmptyState';
import { Sheet } from './ui/Sheet';
import { ConfirmDialog } from './ConfirmDialog';
import { useHeldValue } from './ui/useHeldValue';
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
                <MagnifyingGlass size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
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

            {error && <p className="small mt-3 rounded-[12px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}

            <div className="mt-4">
                {searching && <div className="flex justify-center py-6"><CircleNotch size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} /></div>}
                {!searching && query.trim().length < 2 && <p className="small px-1 py-4 text-center text-secondary">Escribe al menos 2 letras para buscar.</p>}
                {!searching && query.trim().length >= 2 && results.length === 0 && <p className="small px-1 py-4 text-center text-secondary">No encontramos a nadie con “{query.trim()}”.</p>}
                {results.length > 0 && (
                    <div className="stack">
                        {results.map((u) => {
                            const status = sentIds.has(u.id) ? 'pending' : u.friendship_status;
                            return (
                                <div key={u.id} className="row">
                                    <Avatar name={displayNameOf(u)} size={44} />
                                    <span className="min-w-0 flex-1">
                                        <span className="body block truncate font-medium">{displayNameOf(u)}</span>
                                        {u.username && <span className="small block truncate text-secondary">@{u.username}</span>}
                                    </span>
                                    {status === 'accepted' ? (
                                        <span className="small text-secondary">Ya son amigos</span>
                                    ) : status === 'pending' ? (
                                        <span className="small text-secondary">Solicitud enviada</span>
                                    ) : status === 'blocked' ? (
                                        <span className="small text-secondary">No disponible</span>
                                    ) : (
                                        <button type="button" className="btn btn-tinted btn-sm" disabled={sendingId === u.id} onClick={() => send(u.id)}>
                                            {sendingId === u.id ? <CircleNotch size={14} className="animate-spin" /> : <><UserPlus size={15} /> Agregar</>}
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

// Gestionar a un amigo: ver cómo van las cuentas y eliminarlo. La amistad es
// una sola relación compartida: si uno la elimina, desaparece para los dos.
// Los gastos que ya compartieron NO se borran ni se saldan.
const FriendSheet = ({ friend, net, onClose, onRemove, removing, error }) => {
    const [confirming, setConfirming] = useState(false);
    // Conserva al amigo mientras la hoja se cierra (si no, se vacía a media animación).
    const shown = useHeldValue(friend);
    const user = userOf(shown);
    const name = displayNameOf(user);
    const hasBalance = Math.abs(net) > 0.5;

    return (
        <>
            <Sheet isOpen={Boolean(friend)} onClose={onClose} title="Amigo" closeLabel="Cerrar">
                <div className="flex flex-col items-center gap-2 pt-1 text-center">
                    <Avatar name={name} src={user.avatar_url} size={84} />
                    <p className="title">{name}</p>
                    <p className="small">{user.username ? `@${user.username}` : user.email}</p>
                </div>

                <div className="card mt-5 flex items-center justify-between p-4">
                    <span className="body">Cuentas entre ustedes</span>
                    {hasBalance ? (
                        <span className="text-right">
                            <span className="tiny block" style={{ color: net > 0 ? 'var(--pos)' : 'var(--neg)' }}>{net > 0 ? 'te debe' : 'le debes'}</span>
                            <span className="money block" style={{ color: net > 0 ? 'var(--pos)' : 'var(--neg)' }}>{formatCurrency(Math.abs(net))}</span>
                        </span>
                    ) : (
                        <span className="small">Al día</span>
                    )}
                </div>

                {error && <p role="alert" className="small mt-4 rounded-[16px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}

                <button type="button" className="btn btn-danger btn-block mt-6" onClick={() => setConfirming(true)}>
                    <UserMinus size={20} weight="bold" /> Eliminar amigo
                </button>
                <p className="tiny px-1 pt-3 text-center">Deja de ser tu amigo y tú dejas de ser el suyo. Los gastos que ya compartieron se conservan.</p>
            </Sheet>

            <ConfirmDialog
                isOpen={confirming}
                tone="danger"
                title={`¿Eliminar a ${name}?`}
                message={hasBalance
                    ? `Todavía hay ${formatCurrency(Math.abs(net))} pendientes entre ustedes. Eliminarlo no salda esa cuenta: los gastos siguen ahí, pero no podrán crear nuevos juntos.`
                    : 'Ya no podrán dividir gastos nuevos. Para volver a hacerlo tendrán que enviarse una solicitud otra vez.'}
                confirmLabel="Eliminar"
                isLoading={removing}
                onConfirm={async () => { await onRemove(); setConfirming(false); }}
                onCancel={() => setConfirming(false)}
            />
        </>
    );
};

export const FriendsView = ({ friends, pendingRequests, balance, token, onRefresh, isAddOpen, onAddOpenChange }) => {
    const [acceptingId, setAcceptingId] = useState(null);
    const [error, setError] = useState('');
    const [openFriend, setOpenFriend] = useState(null);
    const [removing, setRemoving] = useState(false);
    const [removeError, setRemoveError] = useState('');

    const removeFriend = async () => {
        const id = requestIdOf(openFriend);
        setRemoving(true);
        setRemoveError('');
        try {
            const res = await fetch(`${API_URL}/friends/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'No se pudo eliminar');
            setOpenFriend(null);
            await onRefresh?.();
        } catch (err) {
            setRemoveError(err instanceof TypeError ? 'No hay conexión con el servidor. Revisa tu internet.' : err.message);
        } finally {
            setRemoving(false);
        }
    };

    const netByFriend = useMemo(() => {
        const map = new Map();
        (balance?.by_friend || []).forEach((f) => map.set(f.friend_id, f.net));
        return map;
    }, [balance]);

    const decline = async (requestId) => {
        setAcceptingId(requestId);
        setError('');
        try {
            const res = await fetch(`${API_URL}/friends/${requestId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'No se pudo rechazar');
            await onRefresh?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setAcceptingId(null);
        }
    };

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
                actions={<NavAction label="Agregar amigo" tint onClick={() => onAddOpenChange(true)}><Plus size={20} /></NavAction>}
            />

            {error && <p className="small mb-4 rounded-[12px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}

            {pendingRequests.length > 0 && (
                <>
                    <p className="heading px-1 pb-2">Solicitudes</p>
                    <div className="stack mb-6">
                        {pendingRequests.map((r) => {
                            const user = userOf(r);
                            const id = requestIdOf(r);
                            return (
                                <div key={id} className="row">
                                    <Avatar name={displayNameOf(user)} size={44} />
                                    <span className="min-w-0 flex-1">
                                        <span className="body block truncate font-medium">{displayNameOf(user)}</span>
                                        <span className="small block text-secondary">Quiere ser tu amigo</span>
                                    </span>
                                    <button type="button" className="btn btn-gray btn-sm" disabled={acceptingId === id} onClick={() => decline(id)} aria-label={`Rechazar a ${displayNameOf(user)}`}>
                                        Rechazar
                                    </button>
                                    <button type="button" className="btn btn-primary btn-sm" disabled={acceptingId === id} onClick={() => accept(id)}>
                                        {acceptingId === id ? <CircleNotch size={14} className="animate-spin" /> : 'Aceptar'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {friends.length === 0 ? (
                <EmptyState
                    icon={<UsersThree size={26} />}
                    title="Aún no tienes amigos"
                    message="Agrégalos por nombre, usuario, correo o teléfono para empezar a dividir gastos."
                    action={<button type="button" className="btn btn-primary" onClick={() => onAddOpenChange(true)}>Agregar amigo</button>}
                />
            ) : (
                <>
                    <p className="heading px-1 pb-2">{friends.length} {friends.length === 1 ? 'amigo' : 'amigos'}</p>
                    <div className="stack">
                        {friends.map((f, i) => {
                            const user = userOf(f);
                            const net = netByFriend.get(Number(user.id ?? f.user_id ?? f.friend_id)) || 0;
                            return (
                                <button key={user.id ?? f.id ?? i} type="button" className="row" onClick={() => { setRemoveError(''); setOpenFriend(f); }} aria-label={`Gestionar a ${displayNameOf(user)}`}>
                                    <Avatar name={displayNameOf(user)} size={44} />
                                    <span className="min-w-0 flex-1 text-left">
                                        <span className="body block truncate font-medium">{displayNameOf(user)}</span>
                                        <span className="small block truncate text-secondary">{user.username ? `@${user.username}` : user.email}</span>
                                    </span>
                                    <span className="shrink-0 text-right">
                                        {Math.abs(net) > 0.5 ? (
                                            <>
                                                <span className="tiny block" style={{ color: net > 0 ? 'var(--success)' : 'var(--danger)' }}>{net > 0 ? 'te debe' : 'le debes'}</span>
                                                <span className="heading tabular block" style={{ color: net > 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(Math.abs(net))}</span>
                                            </>
                                        ) : (
                                            <span className="small text-secondary">Al día</span>
                                        )}
                                    </span>
                                    <CaretRight size={16} weight="bold" style={{ color: 'var(--ink-3)' }} className="shrink-0" />
                                </button>
                            );
                        })}
                    </div>
                </>
            )}

            <FriendSheet
                friend={openFriend}
                net={openFriend ? netByFriend.get(Number(userOf(openFriend).id ?? openFriend.user_id ?? openFriend.friend_id)) || 0 : 0}
                onClose={() => setOpenFriend(null)}
                onRemove={removeFriend}
                removing={removing}
                error={removeError}
            />

            <AddFriendSheet isOpen={isAddOpen} onClose={() => onAddOpenChange(false)} token={token} onRefresh={onRefresh} />
        </section>
    );
};
