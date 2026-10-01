import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, HandCoins, Plus } from 'lucide-react';
import { ScreenHeader, NavAction } from './ui/ScreenHeader';
import { Avatar } from './ui/Avatar';
import { EmptyState } from './ui/EmptyState';
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
    const pct = entry.amount_owed > 0 ? Math.min(100, (entry.amount_paid / entry.amount_owed) * 100) : 0;
    const paid = entry.status === 'paid';
    return (
        <button type="button" className="ios-row" onClick={() => onOpen(entry)}>
            <Avatar name={name} size={44} />
            <span className="min-w-0 flex-1">
                <span className="t-body block truncate font-medium">{name}</span>
                <span className="t-footnote block truncate text-secondary">
                    {entry.description || (entry.amount_paid > 0 ? `${kind === 'owed' ? 'Ha pagado' : 'Has pagado'} ${formatCurrency(entry.amount_paid)}` : 'Sin abonos')}
                </span>
                {!paid && entry.amount_paid > 0 && (
                    <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full" style={{ background: 'var(--fill)' }}>
                        <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--success)' }} />
                    </span>
                )}
            </span>
            <span className="shrink-0 text-right">
                <span className="t-caption block text-secondary">{paid ? 'saldada' : 'falta'}</span>
                {!paid && <span className="t-headline tabular block" style={{ color: kind === 'owed' ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(entry.remaining)}</span>}
            </span>
            <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
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
            setOwed(a);
            setOwe(b);
            setError('');
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

    const owedTotal = owed.total_pending || 0;
    const oweTotal = owe.total_pending || 0;
    const net = owedTotal - oweTotal;

    return (
        <section className="animate-fade-up">
            <ScreenHeader
                title="Cuentas"
                subtitle="Lo que te deben y lo que debes, fuera de los gastos compartidos"
                actions={<NavAction label={LEDGER[segment].addTitle} tint onClick={onAdd}><Plus size={20} strokeWidth={2.4} /></NavAction>}
            />

            <div className="ios-card p-5">
                <p className="t-footnote text-secondary">Neto</p>
                <p className="t-money-xl mt-1" style={{ color: net > 0.5 ? 'var(--success)' : net < -0.5 ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {net > 0.5 ? '+' : net < -0.5 ? '−' : ''}{formatCurrency(Math.abs(net))}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => onSegmentChange('owed')} className="rounded-[14px] p-3 text-left transition-transform active:scale-[0.98]" style={{ background: 'var(--success-soft)' }}>
                        <span className="t-caption block" style={{ color: 'var(--success)' }}>Me deben</span>
                        <span className="t-headline tabular block" style={{ color: 'var(--success)' }}>{formatCurrency(owedTotal)}</span>
                    </button>
                    <button type="button" onClick={() => onSegmentChange('owe')} className="rounded-[14px] p-3 text-left transition-transform active:scale-[0.98]" style={{ background: 'var(--danger-soft)' }}>
                        <span className="t-caption block" style={{ color: 'var(--danger)' }}>Debo</span>
                        <span className="t-headline tabular block" style={{ color: 'var(--danger)' }}>{formatCurrency(oweTotal)}</span>
                    </button>
                </div>
            </div>

            <div className="segmented mt-6" role="group" aria-label="Tipo de cuenta">
                <button type="button" aria-pressed={segment === 'owed'} onClick={() => onSegmentChange('owed')}>Me deben</button>
                <button type="button" aria-pressed={segment === 'owe'} onClick={() => onSegmentChange('owe')}>Debo</button>
            </div>

            {error && <p className="t-subhead mt-4 rounded-[12px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}

            {loaded && data.entries.length === 0 ? (
                <div className="mt-4">
                    <EmptyState
                        icon={<HandCoins size={26} />}
                        title={segment === 'owed' ? 'Nadie te debe nada' : 'No debes nada'}
                        message={segment === 'owed'
                            ? 'Anota aquí los préstamos que haces a gente que no usa Split.it, y abónalos cuando te paguen.'
                            : 'Registra tarjetas, préstamos o lo que le debas a alguien y ve abonando poco a poco.'}
                        action={<button type="button" className="btn btn-primary" onClick={onAdd}>{LEDGER[segment].addTitle}</button>}
                    />
                </div>
            ) : (
                <>
                    {pending.length > 0 && (
                        <>
                            <p className="t-section px-4 pb-2 pt-5">Pendientes</p>
                            <div className="ios-group">{pending.map((e) => <EntryRow key={e.id} entry={e} kind={segment} onOpen={(en) => setOpenId(en.id)} />)}</div>
                        </>
                    )}
                    {done.length > 0 && (
                        <>
                            <p className="t-section px-4 pb-2 pt-6">Saldadas</p>
                            <div className="ios-group">{done.map((e) => <EntryRow key={e.id} entry={e} kind={segment} onOpen={(en) => setOpenId(en.id)} />)}</div>
                        </>
                    )}
                </>
            )}

            <LedgerEntrySheet entry={openEntry} kind={segment} onClose={() => setOpenId(null)} onChanged={load} />
        </section>
    );
};
