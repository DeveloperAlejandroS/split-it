export const PARTICIPANT_STATUS = {
    PENDING: 'pending',
    AWAITING_CONFIRMATION: 'awaiting_confirmation',
    PAID: 'paid',
};

// Normaliza el status de un participante desde la API (que puede venir como
// `status: 'pending' | 'paid_pending_confirmation' | 'paid'`, o -en datos
// viejos sin migrar- como el antiguo booleano `is_paid`).
export const getParticipantStatus = (participant) => {
    if (participant?.status === 'paid_pending_confirmation') return PARTICIPANT_STATUS.AWAITING_CONFIRMATION;
    if (participant?.status === 'paid') return PARTICIPANT_STATUS.PAID;
    if (participant?.status === 'pending') return PARTICIPANT_STATUS.PENDING;

    // Fallback para datos legacy sin `status`.
    const legacy = participant?.is_paid;
    const wasPaid = legacy === true || legacy === 1 || legacy === 'true' || legacy === '1';
    return wasPaid ? PARTICIPANT_STATUS.PAID : PARTICIPANT_STATUS.PENDING;
};

export const PARTICIPANT_STATUS_META = {
    [PARTICIPANT_STATUS.PENDING]: { label: 'Pendiente', badgeClass: 'text-secondary', dotClass: 'bg-(--neutral-chip)' },
    [PARTICIPANT_STATUS.AWAITING_CONFIRMATION]: { label: 'Esperando confirmación', badgeClass: 'text-(--info)', dotClass: 'bg-(--info-soft)' },
    [PARTICIPANT_STATUS.PAID]: { label: 'Pagado', badgeClass: 'text-(--success)', dotClass: 'bg-(--success-soft)' },
};

export const numberOrZero = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

// ---- Moneda ------------------------------------------------------------
// Tu cuenta se lleva en UNA moneda principal (elegida en Ajustes, guardada en
// este dispositivo): todos los totales están en ella. Lo que pagues en la otra
// moneda se convierte al registrarlo, con la tasa que tú pones, y queda anotado
// el monto original en el nombre del movimiento.
const CURRENCY_KEY = 'splitit_currency';
export const CURRENCIES = {
    COP: { label: 'Pesos (COP)', locale: 'es-CO', cents: false },
    USD: { label: 'Dólares (USD)', locale: 'en-US', cents: true },
};
let currency = 'COP';
try { const saved = localStorage.getItem(CURRENCY_KEY); if (CURRENCIES[saved]) currency = saved; } catch { /* sin almacenamiento: pesos */ }

export const getCurrency = () => currency;
export const setCurrency = (code) => {
    if (!CURRENCIES[code]) return;
    currency = code;
    try { localStorage.setItem(CURRENCY_KEY, code); } catch { /* vale para esta sesión */ }
};
// Tasa: cuántos pesos vale un dólar. La pone la persona; no se consulta en internet.
const RATE_KEY = 'splitit_usd_rate';
let usdRate = 4000;
try { const saved = Number(localStorage.getItem(RATE_KEY)); if (saved > 0) usdRate = saved; } catch { /* sin almacenamiento */ }
export const getUsdRate = () => usdRate;
export const setUsdRate = (rate) => {
    if (!(Number(rate) > 0)) return;
    usdRate = Number(rate);
    try { localStorage.setItem(RATE_KEY, String(usdRate)); } catch { /* vale para esta sesión */ }
};
export const otherCurrency = () => (currency === 'COP' ? 'USD' : 'COP');
// De la otra moneda a la principal: pesos enteros, o dólares con centavos.
export const convertToMain = (amountInOther) => (currency === 'COP' ? Math.round(amountInOther * usdRate) : Math.round((amountInOther / usdRate) * 100) / 100);
// Monto con la moneda dicha en letras ("US$ 15", "COP 60.000"): para que no se confunda con la principal.
export const foreignLabel = (code, amount) => `${code === 'USD' ? 'US$' : 'COP'} ${new Intl.NumberFormat(CURRENCIES[code].locale, { maximumFractionDigits: CURRENCIES[code].cents ? 2 : 0 }).format(numberOrZero(amount))}`;

// Por debajo de esto una diferencia se considera saldada (medio peso, o medio centavo).
export const moneyEpsilon = () => (CURRENCIES[currency].cents ? 0.005 : 0.5);

export const formatCurrency = (amount, showSign = false) => {
    const value = numberOrZero(amount);
    const { locale, cents } = CURRENCIES[currency];
    const abs = Math.abs(value);
    const formatted = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        // Dólares: centavos solo cuando los hay ($12 y $12.50, no $12.00).
        minimumFractionDigits: cents && !Number.isInteger(abs) ? 2 : 0,
        maximumFractionDigits: cents ? 2 : 0,
    }).format(abs);

    // Un monto negativo SIEMPRE lleva su signo: antes se mostraba el valor
    // absoluto y un saldo de -10 millones se leía como +10 millones.
    if (value < 0) return `−${formatted}`;
    if (showSign && value > 0) return `+${formatted}`;
    return formatted;
};

export const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

// ---- Nombres -----------------------------------------------------------
// Nombre legible de una persona a partir de lo que mande la API (puede
// traer first_name/last_name, username o solo email).
export const displayNameOf = (person) => {
    if (!person) return 'Alguien';
    const full = [person.first_name, person.last_name].map((s) => String(s || '').trim()).filter(Boolean).join(' ');
    if (full) return full;
    if (person.displayName) return String(person.displayName);
    if (person.name) return String(person.name);
    if (person.username) return String(person.username);
    if (person.email) return String(person.email).split('@')[0];
    return 'Alguien';
};

export const firstNameOf = (person) => {
    const first = String(person?.first_name || '').trim();
    if (first) return first.split(/\s+/)[0];
    return displayNameOf(person).split(/\s+/)[0];
};

// ---- Fechas ------------------------------------------------------------
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export const relativeDay = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return '';
    const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
    if (diffDays <= 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return date.toLocaleDateString('es-CO', { weekday: 'long' }).replace(/^./, (c) => c.toUpperCase());
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
};

// ---- Posición del usuario en un gasto compartido -----------------------
// Devuelve qué significa ESTE gasto para quien lo mira:
//   kind: 'owed'    -> te deben (pagaste tú y falta cobrar)
//         'owe'     -> debes (pagó otra persona y falta que pagues)
//         'waiting' -> ya avisaste que pagaste, falta la confirmación
//         'settled' -> todo saldado
//   amount: lo que falta (en COP) para ese caso.
export const getExpenseStake = (expense, currentUserId) => {
    const participants = Array.isArray(expense?.participants) ? expense.participants : [];
    const others = participants.filter((p) => numberOrZero(p.user_id) !== numberOrZero(expense?.paid_by?.id ?? expense?.paid_by));

    if (expense?.paid_by_me) {
        const remaining = others.reduce((sum, p) => {
            if (getParticipantStatus(p) === PARTICIPANT_STATUS.PAID) return sum;
            return sum + Math.max(0, numberOrZero(p.amount_owed) - numberOrZero(p.amount_paid));
        }, 0);
        const awaiting = others.filter((p) => getParticipantStatus(p) === PARTICIPANT_STATUS.AWAITING_CONFIRMATION).length;
        if (remaining <= moneyEpsilon()) return { kind: 'settled', amount: 0, awaiting: 0 };
        return { kind: 'owed', amount: remaining, awaiting };
    }

    const mine = participants.find((p) => numberOrZero(p.user_id) === numberOrZero(currentUserId));
    if (!mine) return { kind: 'settled', amount: 0, awaiting: 0 };
    const status = getParticipantStatus(mine);
    if (status === PARTICIPANT_STATUS.PAID) return { kind: 'settled', amount: 0, awaiting: 0 };
    const remaining = Math.max(0, numberOrZero(mine.amount_owed) - numberOrZero(mine.amount_paid));
    if (status === PARTICIPANT_STATUS.AWAITING_CONFIRMATION) {
        return { kind: 'waiting', amount: numberOrZero(mine.pending_claim_amount) || remaining, awaiting: 1 };
    }
    return { kind: remaining > moneyEpsilon() ? 'owe' : 'settled', amount: remaining, awaiting: 0 };
};
