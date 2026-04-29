export const getPersistentPaidStatus = (participant) => {
    const status = participant?.is_paid;
    return (status === true || status === 1 || status === 'true' || status === '1');
};

export const numberOrZero = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

export const formatCurrency = (amount, showSign = false) => {
    const value = numberOrZero(amount);
    const formatted = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0
    }).format(Math.abs(value));

    if (showSign && value < 0) return `-${formatted}`;
    if (showSign && value > 0) return `+${formatted}`;
    return formatted;
};

export const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};
