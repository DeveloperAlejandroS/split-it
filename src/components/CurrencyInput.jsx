import { useEffect, useState } from 'react';
import { formatCurrency } from '../utils/helpers';

// Input de dinero que muestra el valor formateado en pesos ($1.234.567)
// cuando no está enfocado, y el número plano editable mientras se escribe
// — así siempre se lee como dinero, pero no estorba mientras se escribe.
export const CurrencyInput = ({ value, onChange, onBlur, className = '', placeholder = '$0', autoFocus }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [raw, setRaw] = useState(value === '' || value === undefined || value === null ? '' : String(value));

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isFocused) {
            setRaw(value === '' || value === undefined || value === null ? '' : String(value));
        }
    }, [value, isFocused]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const handleFocus = (e) => {
        setIsFocused(true);
        requestAnimationFrame(() => e.target.select());
    };

    const handleBlur = (e) => {
        setIsFocused(false);
        onBlur?.(e);
    };

    const handleChange = (e) => {
        const next = e.target.value;
        setRaw(next);
        onChange?.(next);
    };

    const displayValue = isFocused
        ? raw
        : (raw !== '' && Number.isFinite(Number(raw)) && Number(raw) !== 0 ? formatCurrency(Number(raw)) : raw);

    return (
        <input
            type={isFocused ? 'number' : 'text'}
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={className}
            placeholder={placeholder}
            autoFocus={autoFocus}
            min="0"
            step="0.01"
        />
    );
};
