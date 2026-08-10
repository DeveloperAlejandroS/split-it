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

    if (showSign && value < 0) return `-${formatted}`;
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
