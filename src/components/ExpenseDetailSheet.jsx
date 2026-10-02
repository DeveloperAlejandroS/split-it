import { useState } from 'react';
import { useHeldValue } from './ui/useHeldValue';
import { CheckCircle, Clock, CircleNotch } from '@phosphor-icons/react';
import { Sheet } from './ui/Sheet';
import { Avatar } from './ui/Avatar';
import { ConfirmDialog } from './ConfirmDialog';
import { CurrencyInput } from './CurrencyInput';
import {
    displayNameOf,
    formatCurrency,
    getExpenseStake,
    getParticipantStatus,
    numberOrZero,
    PARTICIPANT_STATUS,
    relativeDay,
} from '../utils/helpers';

const ProgressBar = ({ owed, paid, claim }) => {
    const total = numberOrZero(owed) || 1;
    const paidPct = Math.min(100, (numberOrZero(paid) / total) * 100);
    const claimPct = Math.min(100 - paidPct, (numberOrZero(claim) / total) * 100);
    return (
        <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--fill)' }}>
            <div className="h-full transition-all" style={{ width: `${paidPct}%`, background: 'var(--success)' }} />
            <div className="h-full transition-all" style={{ width: `${claimPct}%`, background: 'var(--info)', opacity: 0.7 }} />
        </div>
    );
};

const AbonoForm = ({ remaining, busy, onSubmit, onCancel }) => {
    const [amount, setAmount] = useState(String(remaining));
    const value = Number(amount);
    const valid = Number.isFinite(value) && value > 0 && value <= remaining + 0.01;
    return (
        <div className="mt-3 flex items-center gap-2">
            <CurrencyInput value={amount} onChange={setAmount} autoFocus className="field" />
            <button type="button" className="btn btn-success btn-sm btn-44 shrink-0" disabled={!valid || busy} onClick={() => onSubmit(value)}>
                {busy ? <CircleNotch size={16} className="animate-spin" /> : 'Registrar'}
            </button>
            <button type="button" className="btn btn-gray btn-sm btn-44 shrink-0" onClick={onCancel}>Cancelar</button>
        </div>
    );
};

// Resumen en una frase de "dónde estás parado" + la acción principal.
const PositionCard = ({ expense, stake, payerName, busy, onClaim }) => {
    const copy = {
        owed: { title: `Te deben ${formatCurrency(stake.amount)}`, sub: stake.awaiting > 0 ? `${stake.awaiting} ${stake.awaiting === 1 ? 'persona avisó' : 'personas avisaron'} que ya pagó. Confírmalo abajo.` : 'Cuando alguien te pague, márcalo como pagado.', color: 'var(--pos-ink)', bg: 'var(--pos-soft)' },
        owe: { title: `Le debes ${formatCurrency(stake.amount)} a ${payerName}`, sub: 'Cuando le pagues, avísale para que lo confirme.', color: 'var(--neg)', bg: 'var(--neg-soft)' },
        waiting: { title: `Avisaste que pagaste ${formatCurrency(stake.amount)}`, sub: `Falta que ${payerName} lo confirme.`, color: 'var(--info)', bg: 'var(--info-soft)' },
        settled: { title: 'Todo saldado', sub: 'Nadie debe nada en este gasto.', color: 'var(--success)', bg: 'var(--success-soft)' },
    }[stake.kind];

    return (
        <div className="rounded-[18px] p-4" style={{ background: copy.bg }}>
            <p className="heading flex items-center gap-2" style={{ color: copy.color }}>
                {stake.kind === 'settled' ? <CheckCircle size={18} /> : stake.kind === 'waiting' ? <Clock size={18} /> : null}
                {copy.title}
            </p>
            <p className="small mt-1 text-secondary">{copy.sub}</p>
            {stake.kind === 'owe' && !expense.paid_by_me && (
                <button type="button" className="btn btn-primary btn-block mt-3" disabled={busy} onClick={onClaim}>
                    {busy ? <CircleNotch size={18} className="animate-spin" /> : 'Ya pagué'}
                </button>
            )}
        </div>
    );
};

export const ExpenseDetailSheet = ({
    expense: liveExpense,
    currentUserId,
    onClose,
    onClaim,
    onMarkPaid,
    onConfirmPayment,
    onRejectPayment,
    onEdit,
    onDelete,
    isLoading,
}) => {
    const expense = useHeldValue(liveExpense);
    const [busyKey, setBusyKey] = useState(null);
    const [abonoKey, setAbonoKey] = useState(null);
    const [showDelete, setShowDelete] = useState(false);

    const run = async (key, fn) => {
        setBusyKey(key);
        try { await fn(); } finally { setBusyKey(null); }
    };

    const isOwner = Boolean(expense?.paid_by_me);
    const ownerId = expense?.paid_by?.id;
    const participants = Array.isArray(expense?.participants) ? expense.participants : [];
    const stake = expense ? getExpenseStake(expense, currentUserId) : { kind: 'settled', amount: 0 };
    const payerName = expense ? (isOwner ? 'Tú' : displayNameOf(expense.paid_by)) : '';

    const ordered = [...participants].sort((a, b) => {
        if (a.user_id === ownerId) return -1;
        if (b.user_id === ownerId) return 1;
        return 0;
    });

    return (
        <>
            <Sheet isOpen={Boolean(liveExpense)} onClose={onClose} title="Gasto" closeLabel="Cerrar" size="lg">
                {expense && (
                    <>
                        <div className="pb-4 pt-1">
                            <h3 className="title">{expense.description}</h3>
                            <p className="small mt-1 text-secondary">
                                {isOwner ? 'Pagaste' : `Pagó ${payerName}`} · {relativeDay(expense.created_at)} · Total del gasto {formatCurrency(expense.amount)}
                            </p>
                        </div>

                        <PositionCard
                            expense={expense}
                            stake={stake}
                            payerName={payerName}
                            busy={busyKey === 'claim' || isLoading}
                            onClaim={() => run('claim', () => onClaim(expense.id))}
                        />

                        <p className="heading px-1 pb-2 pt-6">Cómo se divide</p>
                        <div className="stack">
                            {ordered.map((p) => {
                                const status = getParticipantStatus(p);
                                const isPayer = p.user_id === ownerId;
                                const isMe = numberOrZero(p.user_id) === numberOrZero(currentUserId);
                                const name = isMe ? 'Tú' : displayNameOf(p);
                                const owed = numberOrZero(p.amount_owed);
                                const paid = numberOrZero(p.amount_paid);
                                const claim = numberOrZero(p.pending_claim_amount);
                                const remaining = Math.max(0, owed - paid - claim);
                                const key = String(p.user_id);
                                const busy = busyKey === key || isLoading;

                                let statusLine = '';
                                if (isPayer) statusLine = 'Pagó el gasto';
                                else if (status === PARTICIPANT_STATUS.PAID) statusLine = 'Pagado';
                                else if (status === PARTICIPANT_STATUS.AWAITING_CONFIRMATION) statusLine = `Avisó que pagó ${formatCurrency(claim)}`;
                                else statusLine = paid > 0 ? `Pagó ${formatCurrency(paid)} · falta ${formatCurrency(remaining)}` : 'Pendiente';

                                const statusColor = status === PARTICIPANT_STATUS.PAID || isPayer ? 'var(--text-secondary)' : status === PARTICIPANT_STATUS.AWAITING_CONFIRMATION ? 'var(--info)' : 'var(--warning)';

                                return (
                                    <div key={p.user_id} className="card p-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={name} size={40} />
                                            <span className="min-w-0 flex-1">
                                                <span className="body block truncate font-medium">{name}</span>
                                                <span className="small block" style={{ color: statusColor }}>{statusLine}</span>
                                            </span>
                                            <span className="heading tabular">{formatCurrency(owed)}</span>
                                        </div>

                                        {!isPayer && status !== PARTICIPANT_STATUS.PAID && paid + claim > 0 && <ProgressBar owed={owed} paid={paid} claim={claim} />}

                                        {isOwner && !isPayer && status === PARTICIPANT_STATUS.AWAITING_CONFIRMATION && (
                                            <div className="mt-3 flex gap-2">
                                                <button type="button" className="btn btn-success btn-sm btn-44 flex-1" disabled={busy} onClick={() => run(key, () => onConfirmPayment(expense.id, p.user_id))}>
                                                    {busy ? <CircleNotch size={16} className="animate-spin" /> : `Confirmar ${formatCurrency(claim)}`}
                                                </button>
                                                <button type="button" className="btn btn-gray btn-sm btn-44" disabled={busy} onClick={() => run(key, () => onRejectPayment(expense.id, p.user_id))}>No me pagó</button>
                                            </div>
                                        )}

                                        {isOwner && !isPayer && status === PARTICIPANT_STATUS.PENDING && abonoKey !== key && (
                                            <div className="mt-3 flex gap-2">
                                                <button type="button" className="btn btn-tinted btn-sm btn-44 flex-1" disabled={busy} onClick={() => run(key, () => onMarkPaid(expense.id, p.user_id))}>
                                                    {busy ? <CircleNotch size={16} className="animate-spin" /> : `Me pagó ${formatCurrency(remaining)}`}
                                                </button>
                                                {remaining > 1 && <button type="button" className="btn btn-gray btn-sm btn-44" onClick={() => setAbonoKey(key)}>Otro monto</button>}
                                            </div>
                                        )}

                                        {!isOwner && isMe && status === PARTICIPANT_STATUS.PENDING && remaining > 1 && abonoKey !== key && (
                                            <button type="button" className="btn btn-gray btn-sm btn-44 mt-3" onClick={() => setAbonoKey(key)}>Pagar solo una parte</button>
                                        )}

                                        {abonoKey === key && (
                                            <AbonoForm
                                                remaining={remaining}
                                                busy={busy}
                                                onCancel={() => setAbonoKey(null)}
                                                onSubmit={(amount) => {
                                                    setAbonoKey(null);
                                                    run(key, () => (isOwner ? onMarkPaid(expense.id, p.user_id, amount) : onClaim(expense.id, amount)));
                                                }}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {isOwner && (
                            <div className="mt-6 flex flex-col gap-2">
                                <button type="button" className="btn btn-gray btn-block" onClick={() => onEdit(expense)}>Editar</button>
                                <button type="button" className="btn btn-plain btn-block" style={{ color: 'var(--danger)' }} onClick={() => setShowDelete(true)}>Eliminar gasto</button>
                            </div>
                        )}
                    </>
                )}
            </Sheet>

            <ConfirmDialog
                isOpen={showDelete}
                tone="danger"
                title="¿Eliminar este gasto?"
                message="Se borra el gasto y el estado de pago de todos. No se puede deshacer."
                confirmLabel="Eliminar"
                isLoading={isLoading}
                onConfirm={async () => { await onDelete(expense); setShowDelete(false); }}
                onCancel={() => setShowDelete(false)}
            />
        </>
    );
};
