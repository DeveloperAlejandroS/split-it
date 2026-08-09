// `theme` no longer picks the background by hand — `.glass-shell` ya lee
// `var(--surface)`/`var(--surface-border)`, que cambian solos con
// `data-theme`. La versión vieja de este componente forzaba un
// `rgba(255,255,255,0.45)` fijo por JS para el tema claro, más transparente
// que el propio `--surface` (0.5) y mucho más que `--surface-strong`
// (0.78) — sobre el fondo crema casi blanco de la app, esa opacidad tan
// baja se leía como un borrón gris en vez de una tarjeta blanca elevada.
// Los llamadores todavía pasan `theme={theme}` (queda ignorado como prop
// extra de React, sin warning) — no vale la pena tocar todos los call
// sites solo para borrar un prop que ya no hace nada.
export const GlassCard = ({
    children,
    className = '',
}) => {
    return (
        <div
            className={`glass-shell rounded-3xl backdrop-blur-lg ${className}`}
            style={{ color: 'var(--text-primary)' }}
        >
            {children}
        </div>
    );
};
