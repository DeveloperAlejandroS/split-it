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

export const formatCurrency = (amount, showSign = false) => {
    const value = numberOrZero(amount);
    const formatted = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(Math.abs(value));

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
        if (remaining <= 0.5) return { kind: 'settled', amount: 0, awaiting: 0 };
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
    return { kind: remaining > 0.5 ? 'owe' : 'settled', amount: remaining, awaiting: 0 };
};
