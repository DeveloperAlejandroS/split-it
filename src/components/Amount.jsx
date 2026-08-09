import { formatCurrency } from '../utils/helpers';

export const Amount = ({ value, showSign = false, className = '' }) => {
    const amountValue = Number(value) || 0;

    return (
        <span
            className={`font-black tabular-nums tracking-tight ${className}`}
            style={{ fontVariantNumeric: 'tabular-nums', color: amountValue >= 0 ? 'var(--success)' : 'var(--danger)' }}
        >
            {formatCurrency(amountValue, showSign)}
        </span>
    );
};
