import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Bell, CaretRight, ChartPieSlice, CheckCircle, Clock, HandCoins, Money, PiggyBank, Receipt, UserPlus, Wallet, UsersThree, WarningCircle } from '@phosphor-icons/react';
import { ScreenHeader, NavAction } from './ui/ScreenHeader';
import { Avatar } from './ui/Avatar';
import { Donut } from './ui/Donut';
import { AnimatedNumber } from './AnimatedNumber';
import { API_URL } from '../config/api';
import { getCurrentMonthKey } from '../utils/budgetHelpers';
import {
    displayNameOf,
    firstNameOf,
    formatCurrency,
    getExpenseStake,
    getParticipantStatus,
    numberOrZero,
    relativeDay,
} from '../utils/helpers';

const TOKEN_KEY = 'splitit_jwt';

const Bubble = ({ children, tone = 'violet', size = 44 }) => {
    const tones = {
        violet: { bg: 'var(--card-tint)', fg: 'var(--primary)' },
        teal: { bg: 'var(--pos-soft)', fg: 'var(--pos)' },
        coral: { bg: 'var(--neg-soft)', fg: 'var(--neg)' },
        warn: { bg: 'var(--warn-soft)', fg: 'var(--warn)' },
    };
    const t = tones[tone] || tones.violet;
    return <span className="bubble" style={{ width: size, height: size, background: t.bg, color: t.fg }}>{children}</span>;
};

export const HomeView = ({
    currentUser,
    expenses = [],
    pendingFriendRequests = [],
    balance,
    onNavigate,
    onOpenExpense,
    onOpenAccount,
    banner,
    refreshKey = 0,
    friendCount = 0,
    onAddFriend,
    onConfirmPayment,
}) => {
    const [budget, setBudget] = useState(null);
    const [libreta, setLibreta] = useState({ total_pending: 0 });
    const [debts, setDebts] = useState({ total_pending: 0 });
    const [isLoading, setIsLoading] = useState(true);
    // Si alguna fuente de cifras falla, se conservan los últimos valores buenos
    // y se avisa: mostrar $0 como si fuera real sería peor que no mostrar nada.
    const [loadFailed, setLoadFailed] = useState(false);
    const [busyKey, setBusyKey] = useState(null);

    const loadAll = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const headers = { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`, Accept: 'application/json' };
            const [b, l, d] = await Promise.all([
                fetch(`${API_URL}/budget/${getCurrentMonthKey()}`, { headers }),
                fetch(`${API_URL}/libreta`, { headers }),
                fetch(`${API_URL}/debts`, { headers }),
            ]);
            const [bj, lj, dj] = await Promise.all([b.json().catch(() => null), l.json().catch(() => null), d.json().catch(() => null)]);
            // Inicio es un resumen: lo que sí cargó se pinta, lo que no se marca.
            if (b.ok && bj) setBudget(bj);
            if (l.ok && lj) setLibreta(lj);
            if (d.ok && dj) setDebts(dj);
            setLoadFailed(!(b.ok && bj && l.ok && lj && d.ok && dj));
        } catch {
            setLoadFailed(true);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => { loadAll(); }, [loadAll]);
    // Cambios en vivo: se recarga sin estado de carga (nada parpadea).
    useEffect(() => { if (refreshKey > 0) loadAll(true); }, [refreshKey, loadAll]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Caja real: `carry_forward_cash` es el saldo sin lo que ya se apartó a
    // ahorros este mes (`balance` lo incluye, y sumarlo a `savings_balance`
    // contaba ese ahorro dos veces).
    const totals = budget?.totals;
    const cash = numberOrZero(totals?.carry_forward_cash ?? totals?.balance);
    const savings = numberOrZero(totals?.savings_balance);
    const libretaPending = numberOrZero(libreta.total_pending);
    const debtPending = numberOrZero(debts.total_pending);
    const owedToMe = numberOrZero(balance?.owed_to_me) + libretaPending;
    const iOwe = numberOrZero(balance?.i_owe) + debtPending;

    // "Lo que tienes": solo plata que ya está en tu mano (caja + ahorros).
    // Lo que te deben NO cuenta hasta que te lo paguen, y lo que debes no se
    // resta: ambos se muestran aparte, en sus propias tarjetas.
    const have = cash + savings;
    // Sin presupuesto cargado la caja es desconocida, no cero.
    const cashKnown = budget !== null;

    const today = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

    const spending = useMemo(() => {
        const s = budget?.sections;
        if (!s) return [];
        return [
            { label: 'Fijos', value: numberOrZero(s.fixed_expense.actual_total), color: 'var(--primary)' },
            { label: 'Día a día', value: numberOrZero(s.tracked_expense.actual_total), color: 'var(--lilac)' },
            { label: 'Deudas', value: numberOrZero(s.debt.actual_total), color: 'var(--neg-bright)' },
        ];
    }, [budget]);
    const spendingTotal = spending.reduce((sum, s) => sum + s.value, 0);
    // Apartar a ahorros no es gastar: se muestra aparte, no dentro de "Gastaste".
    const saved = numberOrZero(budget?.sections?.saving?.actual_total);

    // Lo que espera una acción tuya, ordenado por urgencia.
    const attention = useMemo(() => {
        const items = [];
        expenses.forEach((expense) => {
            (expense.participants || []).forEach((p) => {
                if (expense.paid_by_me && getParticipantStatus(p) === 'awaiting_confirmation') {
                    items.push({
                        key: `c-${expense.id}-${p.user_id}`,
                        title: `${firstNameOf(p)} dice que te pagó`,
                        amount: formatCurrency(p.pending_claim_amount),
                        hint: `${expense.description}. Confírmalo.`,
                        icon: <Clock size={22} weight="fill" />,
                        person: p,
                        run: () => onOpenExpense(expense),
                        action: { label: 'Confirmar', run: () => onConfirmPayment?.(expense.id, p.user_id) },
                    });
                }
            });
            if (!expense.paid_by_me) {
                const stake = getExpenseStake(expense, currentUser?.id);
                if (stake.kind === 'owe') {
                    items.push({
                        key: `o-${expense.id}`,
                        title: `Le debes a ${firstNameOf(expense.paid_by)}`,
                        amount: formatCurrency(stake.amount),
                        hint: expense.description,
                        icon: <Receipt size={22} weight="fill" />,
                        person: expense.paid_by,
                        run: () => onOpenExpense(expense),
                    });
                }
            }
        });
        if (pendingFriendRequests.length > 0) {
            items.unshift({
                key: 'fr',
                title: pendingFriendRequests.length === 1 ? 'Solicitud de amistad' : `${pendingFriendRequests.length} solicitudes de amistad`,
                amount: '',
                hint: 'Acéptalas para dividir gastos.',
                icon: <Bell size={22} weight="fill" />,
                run: () => onNavigate('friends'),
            });
        }
        return items.slice(0, 6);
    }, [expenses, pendingFriendRequests, currentUser?.id, onOpenExpense, onNavigate, onConfirmPayment]);

    const runAction = async (item) => {
        setBusyKey(item.key);
        try { await item.action.run(); } finally { setBusyKey(null); }
    };

    // Dos listas con significado distinto, que antes iban mezcladas:
    //  - Cuentas abiertas: gastos compartidos con plata pendiente entre personas
    //    (sin signo: todavía no entró ni salió nada).
    //  - Movimientos de caja: lo que de verdad se movió (con signo).
    const { openAccounts, cashMoves } = useMemo(() => {
        const open = [];
        const cash = [];
        expenses.slice(0, 12).forEach((e) => {
            const ts = e.updated_at || e.created_at;
            if (!ts) return;
            const stake = getExpenseStake(e, currentUser?.id);
            if (stake.kind === 'settled') {
                cash.push({
                    key: `e${e.id}`, ts, title: e.description, icon: <Receipt size={22} weight="duotone" />, tone: 'violet',
                    meta: `${e.paid_by_me ? 'Pagaste tú' : `Pagó ${firstNameOf(e.paid_by)}`} · ${relativeDay(ts)}`,
                    display: formatCurrency(e.amount), color: 'var(--ink-3)', onClick: () => onOpenExpense(e),
                });
                return;
            }
            const others = (e.participants || []).filter((pt) => numberOrZero(pt.user_id) !== numberOrZero(currentUser?.id));
            const person = stake.kind === 'owed' ? (others.find((pt) => getParticipantStatus(pt) !== 'paid') || others[0]) : e.paid_by;
            open.push({
                key: `e${e.id}`, ts, title: e.description, person,
                meta: `${stake.kind === 'owed' ? `${firstNameOf(person)} te debe` : stake.kind === 'owe' ? `Le debes a ${firstNameOf(e.paid_by)}` : 'Esperando confirmación'} · ${relativeDay(ts)}`,
                display: formatCurrency(stake.amount),
                color: stake.kind === 'owed' ? 'var(--pos)' : stake.kind === 'owe' ? 'var(--neg)' : 'var(--info)',
                onClick: () => onOpenExpense(e),
            });
        });
        Object.values(budget?.sections || {}).forEach((bucket) => {
            (bucket.items || []).forEach((item) => {
                if (item.is_pending || item.is_split_synced) return;
                const ts = item.created_at || item.updated_at;
                const amt = Math.abs(numberOrZero(item.actual_amount));
                if (!ts || amt === 0) return;
                const mk = (positive, meta, tone, icon, go) => ({
                    key: `b${item.id}`, ts, title: item.label, icon, tone, meta: `${meta} · ${relativeDay(ts)}`,
                    display: `${positive ? '+' : '−'}${formatCurrency(amt)}`, color: positive ? 'var(--pos)' : 'var(--ink)', onClick: () => onNavigate(go),
                });
                if (item.libreta_entry_id) cash.push(mk(true, 'Abono que te hicieron', 'teal', <HandCoins size={22} weight="duotone" />, 'accounts'));
                else if (item.debt_entry_id) cash.push(mk(false, 'Pago de una deuda', 'coral', <HandCoins size={22} weight="duotone" />, 'accounts'));
                else cash.push(mk(item.section === 'income' || item.section === 'saving', item.section === 'saving' ? 'Ahorro' : 'Presupuesto', item.section === 'income' ? 'teal' : item.section === 'saving' ? 'violet' : 'coral', item.section === 'saving' ? <PiggyBank size={22} weight="duotone" /> : <Money size={22} weight="duotone" />, 'personal'));
            });
        });
        const byDate = (x, y) => new Date(y.ts) - new Date(x.ts);
        return { openAccounts: open.sort(byDate).slice(0, 4), cashMoves: cash.sort(byDate).slice(0, 6) };
    }, [expenses, budget, currentUser?.id, onOpenExpense, onNavigate]);

    // Todo al día: un estado pensado, no una pantalla que simplemente se vacía.
    const allClear = !isLoading && cashKnown && attention.length === 0 && openAccounts.length === 0 && friendCount > 0;

    return (
        <section>
            <ScreenHeader
                kicker="Hola,"
                title={firstNameOf(currentUser)}
                subtitle={today}
                actions={
                    <>
                        <NavAction label="Amigos" badge={pendingFriendRequests.length} onClick={() => onNavigate('friends')}><UsersThree size={22} weight="bold" /></NavAction>
                        <button type="button" onClick={onOpenAccount} aria-label="Tu cuenta" className="rounded-full transition-transform active:scale-90 xl:hidden"><Avatar name={displayNameOf(currentUser)} src={currentUser?.avatar_url} size={44} /></button>
                    </>
                }
            />

            {banner}

            {loadFailed && (
                <div role="status" className="mb-5 flex items-center gap-3 rounded-[20px] p-3 pl-4" style={{ background: 'var(--warn-soft)', color: 'var(--ink)' }}>
                    <WarningCircle size={22} weight="fill" style={{ color: 'var(--warn)' }} className="shrink-0" />
                    <p className="small flex-1" style={{ color: 'var(--ink)' }}>No pudimos actualizar algunas cifras. Lo que ves puede estar desactualizado.</p>
                    <button type="button" className="btn btn-tinted btn-sm shrink-0" onClick={() => loadAll()}>Reintentar</button>
                </div>
            )}

            <div className="stagger flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] xl:items-start xl:gap-x-6">
              <div className="flex flex-col gap-5 xl:order-1">
                <div className="hero p-6">
                    <p className="small">Lo que tienes</p>
                    {cashKnown ? (
                        <p className="money-xl mt-2"><AnimatedNumber value={have} /></p>
                    ) : isLoading ? (
                        <span className="skeleton mt-2 block h-11 w-56" style={{ background: 'rgba(255,255,255,0.18)' }} aria-label="Cargando" />
                    ) : (
                        <p className="money-xl mt-2" aria-label="Sin datos">—</p>
                    )}
                    <p className="small mt-2">Caja y ahorros. Lo que te deben no suma hasta que te paguen.</p>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => onNavigate('personal')} className="rounded-[18px] p-3 text-left transition-transform active:scale-[0.97]" style={{ background: 'rgba(255,255,255,0.16)' }}>
                            <span className="flex items-center gap-1.5 tiny" style={{ color: 'rgba(255,255,255,0.92)' }}><Wallet size={14} weight="fill" /> En caja</span>
                            <span className="money-md mt-1 block">{cashKnown ? formatCurrency(cash) : '—'}</span>
                        </button>
                        <button type="button" onClick={() => onNavigate('personal')} className="rounded-[18px] p-3 text-left transition-transform active:scale-[0.97]" style={{ background: 'rgba(255,255,255,0.16)' }}>
                            <span className="flex items-center gap-1.5 tiny" style={{ color: 'rgba(255,255,255,0.92)' }}><PiggyBank size={14} weight="fill" /> Ahorros</span>
                            <span className="money-md mt-1 block">{cashKnown ? formatCurrency(savings) : '—'}</span>
                        </button>
                    </div>

                    {/* Lo que está en juego pero aún no es tuyo: va pegado a la cifra, en voz baja. */}
                    <div className="mt-4 grid grid-cols-2 gap-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                        <button type="button" onClick={() => onNavigate('expenses')} className="flex min-h-[44px] items-center gap-2.5 text-left transition-transform active:scale-[0.97]">
                            <span className="bubble h-9 w-9 rounded-full" style={{ background: 'var(--pos-bright)', color: '#0b1f3a' }}><ArrowDownLeft size={18} weight="bold" /></span>
                            <span className="min-w-0">
                                <span className="tiny block" style={{ color: 'rgba(255,255,255,0.92)' }}>Te deben</span>
                                <span className="money-md block">{formatCurrency(owedToMe)}</span>
                            </span>
                        </button>
                        <button type="button" onClick={() => onNavigate('expenses')} className="flex min-h-[44px] items-center gap-2.5 text-left transition-transform active:scale-[0.97]">
                            <span className="bubble h-9 w-9 rounded-full" style={{ background: 'var(--neg-bright)', color: '#3a0f06' }}><ArrowUpRight size={18} weight="bold" /></span>
                            <span className="min-w-0">
                                <span className="tiny block" style={{ color: 'rgba(255,255,255,0.92)' }}>Debes</span>
                                <span className="money-md block">{formatCurrency(iOwe)}</span>
                            </span>
                        </button>
                    </div>
                </div>

                {allClear && (
                    <div className="card flex items-center gap-3 p-4" style={{ background: 'var(--pos-soft)' }}>
                        <span className="bubble h-11 w-11 rounded-full" style={{ background: 'var(--pos-bright)', color: '#0b1f3a' }}><CheckCircle size={24} weight="fill" /></span>
                        <span className="min-w-0 flex-1">
                            <span className="heading block">Todo al día</span>
                            <span className="small block" style={{ color: 'var(--ink)' }}>No tienes nada pendiente con nadie.</span>
                        </span>
                    </div>
                )}

                {friendCount === 0 && (
                    <div className="card flex items-center gap-3 p-4">
                        <Bubble tone="violet"><UsersThree size={22} weight="duotone" /></Bubble>
                        <span className="min-w-0 flex-1">
                            <span className="heading block">Empieza con un amigo</span>
                            <span className="small block">Agrégalo para dividir un gasto con él.</span>
                        </span>
                        <button type="button" className="btn btn-primary btn-sm shrink-0" onClick={onAddFriend}><UserPlus size={16} weight="bold" /> Agregar</button>
                    </div>
                )}

                {attention.length > 0 && (
                    <div>
                        <h2 className="title mb-3">Requiere tu atención</h2>
                        <div className="snap-x-row snap-grow scrollbar-hide" role="region" aria-label={`Requiere tu atención, ${attention.length} ${attention.length === 1 ? 'aviso' : 'avisos'}`}>
                            {attention.map((a) => (
                                <div key={a.key} className="card flex w-[min(260px,calc(100vw-96px))] flex-col gap-3 p-4">
                                    <button type="button" onClick={a.run} className="flex flex-col gap-3 text-left transition-transform active:scale-[0.98]">
                                        {a.person ? (
                                            <Avatar name={displayNameOf(a.person)} size={44} />
                                        ) : (
                                            <span className="bubble h-11 w-11 rounded-full" style={{ background: 'var(--card-tint)', color: 'var(--primary)' }}>{a.icon}</span>
                                        )}
                                        <span>
                                            <span className="heading block">{a.title}</span>
                                            {a.amount && <span className="money-lg mt-1 block">{a.amount}</span>}
                                            <span className="small mt-1 block leading-tight">{a.hint}</span>
                                        </span>
                                    </button>
                                    {a.action && (
                                        <button type="button" className="btn btn-primary btn-sm mt-auto w-full" style={{ height: 44 }} disabled={busyKey === a.key} onClick={() => runAction(a)}>
                                            {busyKey === a.key ? '…' : a.action.label}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

              </div>

              <div className="card p-5 xl:order-3 xl:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                      <h2 className="title">Tu mes</h2>
                      <button type="button" className="btn btn-plain btn-sm" style={{ height: 44 }} onClick={() => onNavigate('personal')}>Ver más <CaretRight size={14} weight="bold" /></button>
                  </div>
                  {spendingTotal > 0 ? (
                      <div className="flex items-center gap-5">
                          <Donut segments={spending} size={148} thickness={20}>
                              <span className="tiny">Gastaste</span>
                              <span className="money text-[17px]">{formatCurrency(spendingTotal)}</span>
                          </Donut>
                          <ul className="min-w-0 flex-1 space-y-2.5">
                              {spending.filter((s) => s.value > 0).map((s) => (
                                  <li key={s.label} className="flex items-center gap-2">
                                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                                      <span className="small min-w-0 flex-1 truncate">{s.label}</span>
                                      <span className="money">{formatCurrency(s.value)}</span>
                                  </li>
                              ))}
                          </ul>
                      </div>
                  ) : (
                      <p className="small">Aún no has gastado nada este mes. Toca el botón + para registrar el primer movimiento.</p>
                  )}
                  {saved > 0 && <p className="small mt-4 flex items-center gap-2"><PiggyBank size={16} weight="fill" style={{ color: "var(--primary)" }} /> Apartaste {formatCurrency(saved)} en ahorros este mes.</p>}
              </div>

              <div className="flex flex-col gap-5 xl:order-2">
                {openAccounts.length > 0 && (
                    <div>
                        <h2 className="title mb-3">Cuentas abiertas</h2>
                        <div className="stack">
                            {openAccounts.map((r) => (
                                <button key={r.key} type="button" className="row" onClick={r.onClick}>
                                    <Avatar name={displayNameOf(r.person)} size={44} />
                                    <span className="min-w-0 flex-1">
                                        <span className="body block truncate font-semibold">{r.title}</span>
                                        <span className="small block truncate">{r.meta}</span>
                                    </span>
                                    <span className="money" style={{ color: r.color }}>{r.display}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <h2 className="title mb-3">Movimientos de caja</h2>
                    {isLoading && cashMoves.length === 0 ? (
                        <div className="stack" aria-label="Cargando movimientos">
                            {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 20 }} />)}
                        </div>
                    ) : cashMoves.length === 0 ? (
                        <div className="card px-6 py-8 text-center"><p className="small">Todavía no hay movimientos de caja.</p></div>
                    ) : (
                        <div className="stack">
                            {cashMoves.map((r) => (
                                <button key={r.key} type="button" className="row" onClick={r.onClick}>
                                    <Bubble tone={r.tone}>{r.icon}</Bubble>
                                    <span className="min-w-0 flex-1">
                                        <span className="body block truncate font-semibold">{r.title}</span>
                                        <span className="small block truncate">{r.meta}</span>
                                    </span>
                                    <span className="money" style={{ color: r.color }}>{r.display}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
              </div>
            </div>
        </section>
    );
};
