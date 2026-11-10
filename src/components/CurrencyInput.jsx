import { useEffect, useRef, useState } from 'react';
import { convertToMain, foreignLabel, formatCurrency, getCurrency, getUsdRate, otherCurrency } from '../utils/helpers';

// Input de dinero que muestra el valor formateado ($1.234.567) cuando no está
// enfocado, y el número plano editable mientras se escribe — así siempre se
// lee como dinero, pero no estorba mientras se escribe.
//
// Con `echo` (los montos grandes de los formularios de crear) se puede escribir
// en la otra moneda: hacia afuera `onChange` SIEMPRE entrega el monto ya
// convertido a la moneda principal, y `onNote` entrega el original ("US$ 15")
// para dejarlo anotado en el nombre del movimiento.
export const CurrencyInput = ({ value, onChange, onBlur, onNote, className = '', placeholder = '$0', autoFocus, echo = false, ...rest }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [raw, setRaw] = useState(value === '' || value === undefined || value === null ? '' : String(value));
    const [foreign, setForeign] = useState(false);
    const lastEmitted = useRef(null);
    const main = getCurrency();
    const other = otherCurrency();

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        const next = value === '' || value === undefined || value === null ? '' : String(value);
        // Eco de lo que este mismo input acaba de emitir: lo escrito se conserva tal cual.
        if (next === lastEmitted.current) return;
        // Lo cambió el formulario (se reinició, "pagar todo", editar): viene en la moneda principal.
        lastEmitted.current = next;
        setForeign(false);
        if (!isFocused) setRaw(next);
    }, [value, isFocused]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const emit = (nextRaw, isForeign) => {
        const n = Number(nextRaw);
        const usable = nextRaw !== '' && Number.isFinite(n);
        const out = isForeign && usable ? String(convertToMain(n)) : nextRaw;
        lastEmitted.current = out;
        onChange?.(out);
        onNote?.(isForeign && usable && n > 0 ? foreignLabel(other, n) : null);
    };

    // Al enfocar, seleccionar todo para reemplazar un valor existente (sin
    // esto en móvil toca borrar a mano). Solo si hay algo escrito y solo si
    // quien escribe aún no empezó: un select() tardío se comía el primer
    // dígito ("30000" quedaba en "3").
    const handleFocus = (e) => {
        const el = e.target;
        const before = el.value;
        setIsFocused(true);
        if (before === '') return;
        setTimeout(() => { if (document.activeElement === el && el.value === before) el.select(); }, 0);
    };

    const handleBlur = (e) => {
        setIsFocused(false);
        onBlur?.(e);
    };

    const handleChange = (e) => {
        // Solo dígitos y un separador decimal (acepta coma o punto).
        const cleaned = e.target.value.replace(',', '.').replace(/[^\d.]/g, '');
        const [whole, ...rest] = cleaned.split('.');
        const next = rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
        setRaw(next);
        emit(next, foreign);
    };

    const n = Number(raw);
    const hasNumber = raw !== '' && Number.isFinite(n);
    const displayValue = isFocused || !hasNumber ? raw : foreign ? foreignLabel(other, n) : formatCurrency(n);

    const input = (
        <input
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={className}
            placeholder={placeholder}
            autoFocus={autoFocus}
            autoComplete="off"
            {...rest}
        />
    );

    if (!echo) return input;

    // Eco: en la moneda principal, 4500000 se lee mal y "$ 4.500.000" no; en la
    // otra moneda, dice a cuánto equivale y con qué tasa.
    const echoText = foreign
        ? (hasNumber && n > 0 ? `= ${formatCurrency(convertToMain(n))} · 1 USD = ${foreignLabel('COP', getUsdRate())}` : `1 USD = ${foreignLabel('COP', getUsdRate())} (cámbialo en Ajustes)`)
        : (isFocused && hasNumber && n >= 1000 ? formatCurrency(n) : '');

    return (
        <>
            {input}
            <p className="t-subhead tabular text-center text-secondary" style={{ minHeight: 22 }} aria-live="polite">{echoText}</p>
            <div className="segmented mx-auto mt-1 w-fit" role="group" aria-label="Moneda en la que escribes el monto" style={{ background: 'var(--card-soft)', boxShadow: 'none' }}>
                {[main, other].map((code) => (
                    <button key={code} type="button" aria-pressed={(code === other) === foreign} style={{ minWidth: 64 }} onClick={() => { const next = code === other; setForeign(next); emit(raw, next); }}>{code}</button>
                ))}
            </div>
        </>
    );
};
