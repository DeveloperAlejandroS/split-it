import { useEffect, useRef } from 'react';

// Comportamiento de teclado común a hojas y diálogos:
//  - Solo el diálogo de más arriba responde a Escape (antes, con una
//    confirmación abierta sobre una hoja, Escape cerraba las dos a la vez).
//  - Tab se queda dentro del diálogo (no se escapa a la página de fondo).
//  - Al cerrar, el foco vuelve a lo que lo abrió.
const stack = [];

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const focusablesIn = (panel) => [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);

export const useDialog = (active, panelRef, { onEscape, onEnter, returnFocusRef } = {}) => {
    const handlers = useRef({ onEscape, onEnter });
    useEffect(() => { handlers.current = { onEscape, onEnter }; });

    useEffect(() => {
        if (!active) return undefined;
        const token = {};
        stack.push(token);

        const panel = panelRef.current;
        const opener = returnFocusRef?.current ?? (panel?.contains(document.activeElement) ? null : document.activeElement);
        // Si un campo con autoFocus ya tiene el foco, no se lo quitamos.
        if (panel && !panel.contains(document.activeElement)) {
            (panel.querySelector('[data-autofocus]') || panel).focus({ preventScroll: true });
        }

        const onKey = (e) => {
            if (stack[stack.length - 1] !== token) return;
            const el = panelRef.current;
            if (!el) return;

            if (e.key === 'Escape') {
                handlers.current.onEscape?.();
                return;
            }

            if (e.key === 'Tab') {
                const items = focusablesIn(el);
                if (items.length === 0) { e.preventDefault(); return; }
                const first = items[0];
                const last = items[items.length - 1];
                const current = document.activeElement;
                if (!el.contains(current)) { e.preventDefault(); first.focus(); return; }
                if (e.shiftKey && (current === first || current === el)) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && current === last) { e.preventDefault(); first.focus(); }
                return;
            }

            if (e.key === 'Enter') handlers.current.onEnter?.(e);
        };

        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            const index = stack.indexOf(token);
            if (index >= 0) stack.splice(index, 1);
            if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
        };
    }, [active, panelRef, returnFocusRef]);
};

// ¿Hay algún diálogo abierto? Lo usan los atajos globales para no dispararse debajo.
export const isDialogOpen = () => stack.length > 0;
