import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CaretRight, HandCoins, Plus } from '@phosphor-icons/react';
import { ScreenHeader } from './ui/ScreenHeader';
import { Avatar } from './ui/Avatar';
import { EmptyState } from './ui/EmptyState';
import { ProgressBar } from './ui/ProgressBar';
import { LedgerEntrySheet } from './LedgerSheets';
import { LEDGER } from './ledgerConfig';
import { API_URL } from '../config/api';
import { formatCurrency } from '../utils/helpers';

const TOKEN_KEY = 'splitit_jwt';

const fetchLedger = async (path) => {
    const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`, Accept: 'application/json' } });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
    return json;
};

const EntryRow = ({ entry, kind, onOpen }) => {
    const name = entry[LEDGER[kind].nameKey];
    const pct = entry.amount_owed > 0 ? (entry.amount_paid / entry.amount_owed) * 100 : 0;
    const paid = entry.status === 'paid';
    const color = kind === 'owed' ? 'var(--pos)' : 'var(--neg)';
    return (
        <button type="button" className="row" onClick={() => onOpen(entry)} style={{ flexWrap: 'wrap' }}>
            <Avatar name={name} size={46} />
            <span className="min-w-0 flex-1">
                <span className="body block truncate font-semibold">{name}</span>
                <span className="small block truncate">
                    {entry.description || (entry.amount_paid > 0 ? `${kind === 'owed' ? 'Ha pagado' : 'Has pagado'} ${formatCurrency(entry.amount_paid)}` : 'Sin abonos todavía')}
                </span>
            </span>
            <span className="shrink-0 text-right">
                <span className="tiny block">{paid ? 'Saldada' : 'Falta'}</span>
                {!paid && <span className="money block" style={{ color }}>{formatCurrency(entry.remaining)}</span>}
            </span>
            <CaretRight size={16} weight="bold" style={{ color: 'var(--ink-3)' }} className="shrink-0" />
            {!paid && entry.amount_paid > 0 && <span className="block w-full pt-1"><ProgressBar pct={pct} tone={kind === 'owed' ? 'pos' : 'neg'} height={6} /></span>}
        </button>
    );
};

export const AccountsView = ({ segment, onSegmentChange, refreshKey, onAdd }) => {
    const [owed, setOwed] = useState({ entries: [], total_pending: 0 });
    const [owe, setOwe] = useState({ entries: [], total_pending: 0 });
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState('');
    const [openId, setOpenId] = useState(null);

    const load = useCallback(async () => {
        try {
            const [a, b] = await Promise.all([fetchLedger('/libreta'), fetchLedger('/debts')]);
            setOwed(a); setOwe(b); setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoaded(true);
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

    const renderWallet = ({ kind, grad, shadow, icon, label, total }) => {
        const active = segment === kind;
        return (
            <button
                key={kind}
                type="button"
                aria-pressed={active}
                onClick={() => onSegmentChange(kind)}
                className={`tile ${grad} p-4 text-left transition-all active:scale-[0.97]`}
                style={{
                    boxShadow: active ? shadow : 'none',
                    opacity: active ? 1 : 0.72,
                    transform: active ? 'translateY(-3px)' : 'none',
                    transitionDuration: '320ms',
                    transitionTimingFunction: 'var(--spring)',
                }}
            >
                <span className="bubble h-10 w-10 rounded-full" style={{ background: 'rgba(255,255,255,0.28)' }}>{icon}</span>
                <span className="small mt-4 block" style={{ color: 'rgba(255,255,255,0.92)' }}>{label}</span>
                <span className="money-lg block">{formatCurrency(total)}</span>
            </button>
        );
    };

    return (
        <section>
            <ScreenHeader title="Cuentas" subtitle="Préstamos y deudas fuera de los gastos compartidos" />

            <div className="stagger flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-3">
                    {renderWallet({ kind: 'owed', grad: 'tile-teal', shadow: '0 18px 30px -14px rgba(20, 167, 196, 0.75)', icon: <ArrowDownLeft size={20} weight="bold" />, label: 'Me deben', total: owed.total_pending || 0 })}
                    {renderWallet({ kind: 'owe', grad: 'tile-coral', shadow: '0 18px 30px -14px rgba(255, 106, 61, 0.75)', icon: <ArrowUpRight size={20} weight="bold" />, label: 'Debo', total: owe.total_pending || 0 })}
                </div>

                <p className="small px-1">
                    Neto: <strong style={{ color: net >= 0 ? 'var(--pos)' : 'var(--neg)' }}>{net > 0 ? '+' : net < 0 ? '−' : ''}{formatCurrency(Math.abs(net))}</strong>. {segment === 'owed' ? 'Lo que otros te deben fuera de la app.' : 'Lo que debes a personas o entidades.'}
                </p>

                {error && <p className="small rounded-[16px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}

                {loaded && data.entries.length === 0 ? (
                    <EmptyState
                        icon={<HandCoins size={32} weight="duotone" />}
                        title={segment === 'owed' ? 'Nadie te debe nada' : 'No debes nada'}
                        message={segment === 'owed' ? 'Anota aquí los préstamos que haces a gente que no usa Split.it y abónalos cuando te paguen.' : 'Registra tarjetas, préstamos o lo que le debas a alguien y ve abonando poco a poco.'}
                        action={<button type="button" className="btn btn-primary" onClick={onAdd}><Plus size={18} weight="bold" /> {LEDGER[segment].addTitle}</button>}
                    />
                ) : (
                    <>
                        {pending.length > 0 && (
                            <div>
                                <h2 className="title mb-3">Pendientes</h2>
                                <div className="stack">{pending.map((e) => <EntryRow key={e.id} entry={e} kind={segment} onOpen={(en) => setOpenId(en.id)} />)}</div>
                            </div>
                        )}
                        {done.length > 0 && (
                            <div>
                                <h2 className="title mb-3">Saldadas</h2>
                                <div className="stack" style={{ opacity: 0.8 }}>{done.map((e) => <EntryRow key={e.id} entry={e} kind={segment} onOpen={(en) => setOpenId(en.id)} />)}</div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <LedgerEntrySheet entry={openEntry} kind={segment} onClose={() => setOpenId(null)} onChanged={load} />
        </section>
    );
};
