import { useEffect, useRef, useState } from 'react';
import { formatCurrency } from '../utils/helpers';

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Anima un monto de plata cuando cambia (ej. el Balance sube o baja al
// guardar un ítem), en vez de que el número simplemente "salte" al valor
// nuevo.
//
// Implementado como UN solo loop de animación por instancia, vivo desde el
// montaje hasta el desmontaje, que persigue `targetRef` cuadro a cuadro —
// en vez de relanzar/cancelar requestAnimationFrame cada vez que cambia el
// valor. La primera versión hacía eso último y bajo React StrictMode (que
// monta-desmonta-monta los efectos en desarrollo) el reinicio se pisaba a
// sí mismo y el número quedaba trabado en 0.
export const AnimatedNumber = ({ value, showSign = false, className = '', style }) => {
    const numericValue = Number(value) || 0;
    const [display, setDisplay] = useState(numericValue);
    const targetRef = useRef(numericValue);
    const displayRef = useRef(numericValue);

    useEffect(() => {
        targetRef.current = numericValue;
    }, [numericValue]);

    useEffect(() => {
        let rafId;
        const step = () => {
            const target = targetRef.current;
            const current = displayRef.current;
            const diff = target - current;

            if (prefersReducedMotion() || Math.abs(diff) < 1) {
                if (current !== target) {
                    displayRef.current = target;
                    setDisplay(target);
                }
            } else {
                const next = current + diff * 0.2;
                displayRef.current = next;
                setDisplay(next);
            }
            rafId = requestAnimationFrame(step);
        };
        rafId = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafId);
    }, []);

    return (
        <span className={className} style={style}>
            {formatCurrency(display, showSign)}
        </span>
    );
};
