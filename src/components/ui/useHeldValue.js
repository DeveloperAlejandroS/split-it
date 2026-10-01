import { useEffect, useState } from 'react';

// Devuelve el valor actual, o el último no vacío mientras el valor es null.
// Sirve para que un sheet conserve su contenido durante la animación de
// salida (si no, el contenido desaparece antes de que el panel termine de bajar).
export const useHeldValue = (value) => {
    const [held, setHeld] = useState(value);
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (value) setHeld(value);
    }, [value]);
    /* eslint-enable react-hooks/set-state-in-effect */
    return value || held;
};
