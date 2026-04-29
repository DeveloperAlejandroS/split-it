import { formatCurrency } from '../utils/helpers';

export const Amount = ({ value, theme = 'dark', showSign = false, className = '' }) => {
    const amountValue = Number(value) || 0;
    const positiveClass = theme === 'light' ? 'text-emerald-600' : 'text-emerald-400';
    const negativeClass = theme === 'light' ? 'text-rose-600' : 'text-rose-400';
    const valueClass = amountValue >= 0 ? positiveClass : negativeClass;

    return (
        <span
            className={`font-black tabular-nums tracking-tight ${valueClass} ${className}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
        >
            {formatCurrency(amountValue, showSign)}
        </span>
    );
};
