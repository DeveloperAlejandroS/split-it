import { useEffect, useState } from 'react';

// Barra de navegación estilo iOS: una barra translúcida fija arriba (con
// acciones siempre a la mano) y, debajo, el título grande. Al hacer scroll
// el título grande "pasa" a la barra con un fundido -- así el botón de
// agregar vive donde el usuario lo espera (arriba a la derecha) en vez de
// flotar tapando contenido.
const useScrolled = (threshold) => {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > threshold);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [threshold]);
    return scrolled;
};

export const ScreenHeader = ({ title, subtitle, leading, actions }) => {
    const scrolled = useScrolled(34);

    return (
        <>
            <div
                className="sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 material border-b transition-[border-color] duration-200"
                style={{
                    paddingTop: 'var(--safe-top)',
                    borderBottomColor: scrolled ? 'var(--material-border)' : 'transparent',
                    backgroundColor: scrolled ? undefined : 'transparent',
                    WebkitBackdropFilter: scrolled ? undefined : 'none',
                    backdropFilter: scrolled ? undefined : 'none',
                    transition: 'background-color 200ms, border-color 200ms',
                }}
            >
                <div className="relative flex h-14 items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">{leading}</div>
                    <p
                        className="t-headline absolute left-1/2 -translate-x-1/2 max-w-[50%] truncate pointer-events-none"
                        style={{ opacity: scrolled ? 1 : 0, transition: 'opacity 180ms var(--ease-out)' }}
                        aria-hidden={!scrolled}
                    >
                        {title}
                    </p>
                    <div className="flex flex-1 items-center justify-end gap-2">{actions}</div>
                </div>
            </div>

            <div className="pt-1 pb-4">
                <h1 className="t-large-title">{title}</h1>
                {subtitle && <p className="t-subhead mt-1 text-secondary">{subtitle}</p>}
            </div>
        </>
    );
};

// Botón de acción de la barra (círculo tintado, 36px, feedback en :active).
export const NavAction = ({ label, onClick, children, tint = false }) => (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={`btn btn-icon ${tint ? 'is-tint' : ''}`}>
        {children}
    </button>
);
