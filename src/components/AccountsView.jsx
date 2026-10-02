import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CaretRight, HandCoins, Plus, UsersThree, WarningCircle } from '@phosphor-icons/react';
import { ScreenHeader, NavAction } from './ui/ScreenHeader';
import { Avatar } from './ui/Avatar';
import { EmptyState } from './ui/EmptyState';
import { ProgressBar } from './ui/ProgressBar';
import { LedgerEntrySheet } from './LedgerSheets';
import { LEDGER } from './ledgerConfig';
import { API_URL } from '../config/api';
import { formatCurrency } from '../utils/helpers';

const TOKEN_KEY = 'splitit_jwt';

// Más saldadas que esto se pliegan: lo pendiente es lo que se consulta.
const SETTLED_FOLD = 5;

const SEGMENT_HINT = {
    owed: 'Lo que otros te deben fuera de la app.',
    owe: 'Lo que debes a personas o entidades.',
};

const fetchLedger = async (path) => {
    const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`, Accept: 'application/json' } });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
    return json;
};

const friendly = (err) => (err instanceof TypeError ? 'No hay conexión con el servidor. Revisa tu internet.' : err.message);

const EntryRow = ({ entry, kind, onOpen }) => {
    const name = entry[LEDGER[kind].nameKey];
    const pct = entry.amount_owed > 0 ? (entry.amount_paid / entry.amount_owed) * 100 : 0;
    const paid = entry.status === 'paid';
    const color = kind === 'owed' ? 'var(--pos)' : 'var(--neg)';
    // Un nombre accesible que dice qué es y en qué sentido va el dinero.
    const spoken = paid
        ? `${name}, saldada, ${formatCurrency(entry.amount_owed)}. Abrir`
        : `${name}, ${kind === 'owed' ? 'te debe' : 'le debes'} ${formatCurrency(entry.remaining)}. Abrir`;
    return (
        <button type="button" className="row" onClick={() => onOpen(entry)} style={{ flexWrap: 'wrap' }} aria-label={spoken}>
            <Avatar name={name} size={46} />
            <span className="min-w-0 flex-1">
                <span className="body block truncate font-semibold">{name}</span>
                <span className="small block truncate">
                    {entry.description || (entry.amount_paid > 0 ? `${kind === 'owed' ? 'Ha pagado' : 'Has pagado'} ${formatCurrency(entry.amount_paid)}` : 'Sin abonos todavía')}
                </span>
            </span>
            <span className="shrink-0 text-right">
                <span className="tiny block">{paid ? 'Saldada' : 'Falta'}</span>
                {/* Saldada: se sigue viendo de cuánto era, en neutro (antes solo decía "Saldada"). */}
                <span className="money block" style={{ color: paid ? 'var(--ink-3)' : color }}>{formatCurrency(paid ? entry.amount_owed : entry.remaining)}</span>
            </span>
            <CaretRight size={16} weight="bold" style={{ color: 'var(--ink-3)' }} className="shrink-0" aria-hidden="true" />
            {!paid && entry.amount_paid > 0 && <span className="block w-full pt-1"><ProgressBar pct={pct} tone={kind === 'owed' ? 'pos' : 'neg'} height={6} label={`${Math.round(pct)} % ${kind === 'owed' ? 'pagado' : 'abonado'}`} /></span>}
        </button>
    );
};

export const AccountsView = ({ segment, onSegmentChange, refreshKey, onAdd, onOpenFriends, friendBadge }) => {
    const [owed, setOwed] = useState({ entries: [], total_pending: 0 });
    const [owe, setOwe] = useState({ entries: [], total_pending: 0 });
    // `loaded` = ya hubo al menos una carga buena. Antes se marcaba aun si fallaba y
    // se pintaba "Nadie te debe nada" con totales en $0: un fallo parecía una cuenta limpia.
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState('');
    const [openId, setOpenId] = useState(null);
    const [showSettled, setShowSettled] = useState(false);

    const load = useCallback(async () => {
        try {
            const [a, b] = await Promise.all([fetchLedger('/libreta'), fetchLedger('/debts')]);
            setOwed(a); setOwe(b); setError(''); setLoaded(true);
        } catch (err) {
            // Si ya había datos buenos se conservan; el aviso dice que pueden estar viejos.
            setError(friendly(err));
        }
    }, []);

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => { load(); }, [load, refreshKey]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const data = segment === 'owed' ? owed : owe;
    const pending = useMemo(() => data.entries.filter((e) => e.status !== 'paid'), [data]);
    const done = useMemo(() => data.entries.filter((e) => e.status === 'paid'), [data]);
    const openEntry = data.entries.find((e) => e.id === openId) || null;
    const net = (owed.total_pending || 0) - (owe.total_pending || 0);
    const foldDone = done.length > SETTLED_FOLD && !showSettled;

    const renderWallet = ({ kind, grad, shadow, icon, label, total, soft, ink }) => {
        const active = segment === kind;
        const money = loaded ? formatCurrency(total) : '—';
        // Montos largos bajan de talla en vez de recortarse en silencio.
        const size = money.length > 10 ? 'money-md' : 'money-lg';
        return (
            <button
                key={kind}
                type="button"
                aria-pressed={active}
                onClick={() => onSegmentChange(kind)}
                className={`seg-tile ${active ? `tile ${grad}` : 'card'} p-4 text-left active:scale-[0.97]`}
                style={active ? { boxShadow: shadow, transform: 'translateY(-3px)' } : { borderRadius: 20 }}
            >
                <span className="bubble h-10 w-10 rounded-full" style={active ? { background: 'rgba(255,255,255,0.28)' } : { background: soft, color: ink }}>{icon}</span>
                <span className="small mt-4 block">{label}</span>
                <span className={`${size} block`}>{money}</span>
            </button>
        );
    };

    return (
        <section>
            <ScreenHeader
                title="Cuentas"
                subtitle="Préstamos y deudas con personas que no usan Split.it"
                actions={(
                    <>
                        <NavAction label={LEDGER[segment].addTitle} onClick={onAdd}><Plus size={22} weight="bold" /></NavAction>
                        <NavAction label="Amigos" badge={friendBadge} onClick={onOpenFriends}><UsersThree size={22} weight="bold" /></NavAction>
                    </>
                )}
            />

            {error && (
                <div role="alert" className="mb-5 flex items-center gap-3 rounded-[20px] p-3 pl-4" style={{ background: 'var(--danger-soft)' }}>
                    <WarningCircle size={22} weight="fill" style={{ color: 'var(--danger)' }} className="shrink-0" aria-hidden="true" />
                    <p className="small flex-1" style={{ color: 'var(--ink)' }}>{loaded ? 'No pudimos actualizar. Lo que ves puede estar desactualizado.' : error}</p>
                    <button type="button" className="btn btn-tinted btn-sm btn-44 shrink-0" onClick={() => load()}>Reintentar</button>
                </div>
            )}

            <div className="stagger flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:items-start xl:gap-x-6">
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3" role="group" aria-label="Libro de cuentas">
                        {renderWallet({ kind: 'owed', grad: 'tile-teal', shadow: '0 18px 30px -14px rgba(20, 167, 196, 0.75)', icon: <ArrowDownLeft size={20} weight="bold" aria-hidden="true" />, label: 'Me deben', total: owed.total_pending || 0, soft: 'var(--pos-soft)', ink: 'var(--pos)' })}
                        {renderWallet({ kind: 'owe', grad: 'tile-coral', shadow: '0 18px 30px -14px rgba(255, 106, 61, 0.75)', icon: <ArrowUpRight size={20} weight="bold" aria-hidden="true" />, label: 'Debo', total: owe.total_pending || 0, soft: 'var(--neg-soft)', ink: 'var(--neg)' })}
                    </div>

                    {loaded && (
                        <p className="small px-1">
                            {Math.abs(net) < 0.5
                                ? 'Quedarían a mano si todo se paga.'
                                : <>Si todo se paga: <strong style={{ color: 'var(--ink)' }}>{formatCurrency(net, true)}</strong> (neto de estas cuentas).</>}
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-5">
                    {!loaded && !error ? (
                        <div className="stack" role="status" aria-label="Cargando cuentas">
                            {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 70, borderRadius: 20 }} />)}
                        </div>
                    ) : !loaded ? null : data.entries.length === 0 ? (
                        <EmptyState
                            icon={<HandCoins size={32} weight="duotone" />}
                            title={segment === 'owed' ? 'Nadie te debe nada' : 'No debes nada'}
                            message={segment === 'owed' ? 'Anota aquí los préstamos que haces a gente que no usa Split.it y abónalos cuando te paguen.' : 'Registra tarjetas, préstamos o lo que le debas a alguien y ve abonando poco a poco.'}
                            action={<button type="button" className="btn btn-tinted" onClick={onAdd}><Plus size={18} weight="bold" /> {LEDGER[segment].addTitle}</button>}
                        />
                    ) : (
                        <>
                            {pending.length > 0 && (
                                <div>
                                    <h2 className="title">Pendientes</h2>
                                    <p className="small mb-3">{SEGMENT_HINT[segment]}</p>
                                    <div className="stack">{pending.map((e) => <EntryRow key={e.id} entry={e} kind={segment} onOpen={(en) => setOpenId(en.id)} />)}</div>
                                </div>
                            )}
                            {done.length > 0 && (
                                <div>
                                    <h2 className="title mb-3">Saldadas ({done.length})</h2>
                                    {foldDone ? (
                                        <button type="button" className="row" aria-expanded="false" onClick={() => setShowSettled(true)}>
                                            <span className="body flex-1 font-semibold">Ver las {done.length} saldadas</span>
                                            <CaretRight size={16} weight="bold" style={{ color: 'var(--ink-3)' }} aria-hidden="true" />
                                        </button>
                                    ) : (
                                        <div className="stack">{done.map((e) => <EntryRow key={e.id} entry={e} kind={segment} onOpen={(en) => setOpenId(en.id)} />)}</div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <LedgerEntrySheet entry={openEntry} kind={segment} onClose={() => setOpenId(null)} onChanged={load} />
        </section>
    );
};
