import { useEffect, useRef } from 'react';
import { isDialogOpen } from '../components/ui/useDialog';

// Atajos de teclado (pensados para escritorio):
//   N        agregar (lo que toque según la pantalla)
//   1 … 5    ir a Inicio, Gastos, Presupuesto, Cuentas, Amigos
//   ← →      moverse entre opciones de un control segmentado enfocado
// No se disparan mientras se escribe en un campo, con Ctrl/Alt/Cmd, ni con
// una hoja o diálogo abierto.
const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

export const useShortcuts = (enabled, { onAdd, onTab, tabs }) => {
    const handlers = useRef({ onAdd, onTab, tabs });
    useEffect(() => { handlers.current = { onAdd, onTab, tabs }; });

    useEffect(() => {
        if (!enabled) return undefined;

        const onKey = (e) => {
            if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;

            // Flechas dentro de un control segmentado: funciona también en hojas.
            if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target.closest?.('.segmented')) {
                const buttons = [...e.target.closest('.segmented').querySelectorAll('button:not(:disabled)')];
                const index = buttons.indexOf(e.target);
                if (index < 0) return;
                const next = buttons[(index + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length];
                e.preventDefault();
                next.focus();
                next.click();
                return;
            }

            if (isTyping(e.target) || isDialogOpen()) return;
            const { onAdd: add, onTab: go, tabs: list } = handlers.current;

            if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                add?.();
                return;
            }
            const number = Number(e.key);
            if (Number.isInteger(number) && number >= 1 && number <= list.length) {
                e.preventDefault();
                go?.(list[number - 1]);
            }
        };

        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [enabled]);
};
