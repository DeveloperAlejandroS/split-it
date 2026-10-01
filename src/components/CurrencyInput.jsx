import { useEffect, useState } from 'react';
import { formatCurrency } from '../utils/helpers';

// Input de dinero que muestra el valor formateado en pesos ($1.234.567)
// cuando no está enfocado, y el número plano editable mientras se escribe
// — así siempre se lee como dinero, pero no estorba mientras se escribe.
export const CurrencyInput = ({ value, onChange, onBlur, className = '', placeholder = '$0', autoFocus, echo = false, ...rest }) => {
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

    const input = (
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
            autoComplete="off"
            {...rest}
        />
    );

    if (!echo) return input;

    // Eco formateado: 4500000 se lee mal; "$ 4.500.000" no.
    const n = Number(raw);
    return (
        <>
            {input}
            <p className="t-subhead tabular text-center text-secondary" style={{ minHeight: 22 }} aria-hidden="true">
                {isFocused && Number.isFinite(n) && n >= 1000 ? formatCurrency(n) : ''}
            </p>
        </>
    );
};
