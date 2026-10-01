// Estado vacío con salida: un título corto, una línea que explica y (casi
// siempre) la acción que lo resuelve -- nunca un callejón sin salida.
export const EmptyState = ({ icon, title, message, action }) => (
    <div className="ios-card px-6 py-12 text-center">
        {icon && (
            <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
                {icon}
            </div>
        )}
        <h3 className="t-headline">{title}</h3>
        {message && <p className="t-subhead mx-auto mt-1.5 max-w-xs text-secondary">{message}</p>}
        {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
);
