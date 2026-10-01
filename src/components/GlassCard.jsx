// Tarjeta base. Se mantiene el nombre por compatibilidad con las pantallas
// de presupuesto, pero ahora es una tarjeta sólida estilo iOS (se separa del
// fondo por tono y sombra suave, no por borde translúcido). `theme` y
// `strong` ya no cambian nada: los tokens resuelven ambos temas solos.
export const GlassCard = ({ children, className = '' }) => (
    <div className={`ios-card ${className}`} style={{ color: 'var(--text-primary)' }}>
        {children}
    </div>
);
