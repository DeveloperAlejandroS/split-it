import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleNotch } from '@phosphor-icons/react';

// Sheet estilo iOS: en móvil sube desde abajo y se arrastra para cerrar; en
// pantallas anchas es un diálogo centrado. Reglas de movimiento (Apple,
// "Designing Fluid Interfaces"):
//  - el panel sigue al dedo 1:1 mientras se arrastra (sin animación CSS),
//  - al soltar se decide por la velocidad proyectada, no por la posición,
//  - se anima desde el valor actual en pantalla (no salta),
//  - entra y sale por el mismo camino (abajo).
// Mientras se arrastra hacia arriba hay resistencia (rubber-band).

const DISMISS_VELOCITY = 0.5; // px/ms
const EXIT_MS = 260;

let scrollLocks = 0;
const lockScroll = () => {
    if (scrollLocks++ === 0) document.documentElement.style.overflow = 'hidden';
};
const unlockScroll = () => {
    if (--scrollLocks <= 0) {
        scrollLocks = 0;
        document.documentElement.style.overflow = '';
    }
};

const rubberband = (overshoot, dimension = 400, constant = 0.55) =>
    (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));

export const Sheet = ({
    isOpen,
    onClose,
    title,
    children,
    action, // { label, onClick, disabled, loading }
    closeLabel = 'Cancelar',
    size = 'md', // 'md' | 'lg'
    zIndex = 90,
}) => {
    const [mounted, setMounted] = useState(isOpen);
    const [closing, setClosing] = useState(false);
    const panelRef = useRef(null);
    const drag = useRef(null);
    const [draggedOut, setDraggedOut] = useState(false);

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (isOpen) {
            setMounted(true);
            setClosing(false);
            setDraggedOut(false);
            return undefined;
        }
        if (!mounted) return undefined;
        setClosing(true);
        const t = setTimeout(() => { setMounted(false); setClosing(false); }, EXIT_MS);
        return () => clearTimeout(t);
    }, [isOpen, mounted]);
    /* eslint-enable react-hooks/set-state-in-effect */

    useEffect(() => {
        if (!mounted) return undefined;
        lockScroll();
        return unlockScroll;
    }, [mounted]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        document.addEventListener('keydown', onKey);
        panelRef.current?.focus({ preventScroll: true });
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    const onPointerDown = useCallback((e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const panel = panelRef.current;
        if (!panel) return;
        panel.style.transition = 'none';
        drag.current = { startY: e.clientY, lastY: e.clientY, lastT: performance.now(), v: 0, dy: 0 };
    }, []);

    const onPointerMove = useCallback((e) => {
        const d = drag.current;
        if (!d) return;
        const now = performance.now();
        const rawDy = e.clientY - d.startY;
        d.dy = rawDy;
        const dt = now - d.lastT;
        if (dt > 0) d.v = 0.8 * ((e.clientY - d.lastY) / dt) + 0.2 * d.v;
        d.lastY = e.clientY;
        d.lastT = now;
        const y = rawDy < 0 ? -rubberband(-rawDy) : rawDy;
        panelRef.current.style.transform = `translateY(${y}px)`;
    }, []);

    const onPointerUp = useCallback(() => {
        const d = drag.current;
        drag.current = null;
        const panel = panelRef.current;
        if (!d || !panel) return;
        const height = panel.getBoundingClientRect().height;
        // Posición proyectada con la velocidad de suelta (decaimiento exponencial).
        const projected = d.dy + (d.v * 1000 / 1000) * (0.998 / (1 - 0.998)) * 0.16;
        const shouldDismiss = d.v > DISMISS_VELOCITY || (d.v > -DISMISS_VELOCITY && projected > height * 0.4);
        panel.style.transition = `transform ${shouldDismiss ? 240 : 380}ms var(--ease-ios)`;
        if (shouldDismiss) {
            panel.style.transform = `translateY(${height + 40}px)`;
            setDraggedOut(true);
            setTimeout(() => onClose?.(), 120);
        } else {
            panel.style.transform = 'translateY(0)';
        }
    }, [onClose]);

    if (!mounted) return null;

    const maxW = size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md';

    return createPortal(
        <div
            className="sheet-backdrop flex items-end sm:items-center justify-center sm:p-6"
            style={{ zIndex }}
            data-closing={closing}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
            role="presentation"
        >
            <div
                ref={panelRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`sheet-panel ${closing ? (draggedOut ? '' : 'animate-sheet-out') : 'animate-sheet-in'} relative w-full ${maxW} flex flex-col outline-none`}
                style={{ maxHeight: 'min(92dvh, 860px)' }}
            >
                {/* Zona de arrastre: grabber + barra de título */}
                <div
                    className="shrink-0 touch-none select-none cursor-grab active:cursor-grabbing"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                >
                    <div className="flex justify-center pt-2.5 sm:hidden">
                        <span className="block h-[5px] w-10 rounded-full" style={{ background: 'var(--lilac)', opacity: 0.7 }} />
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 pt-2 pb-3 min-h-14">
                        <div className="justify-self-start">
                            <button type="button" className="btn btn-plain btn-sm" style={{ height: 40, fontSize: 15, fontWeight: 500 }} onClick={onClose}>
                                {closeLabel}
                            </button>
                        </div>
                        <h2 className="heading text-center truncate max-w-[55vw]">{title}</h2>
                        <div className="justify-self-end">
                            {action && (
                                <button
                                    type="button"
                                    className="btn btn-plain btn-sm"
                                    style={{ height: 40, fontSize: 15, fontWeight: 700 }}
                                    disabled={action.disabled || action.loading}
                                    onClick={action.onClick}
                                >
                                    {action.loading ? <CircleNotch size={18} className="animate-spin" /> : action.label}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div
                    className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-5"
                    style={{ overscrollBehavior: 'contain', paddingBottom: 'calc(20px + var(--safe-bottom))' }}
                >
                    {children}
                </div>
            </div>
        </div>,
        document.body,
    );
};
