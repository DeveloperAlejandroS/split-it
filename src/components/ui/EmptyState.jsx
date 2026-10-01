// Estado vacío con salida: qué falta, por qué importa, y la acción que lo resuelve.
export const EmptyState = ({ icon, title, message, action }) => (
    <div className="card px-6 py-10 text-center">
        {icon && (
            <div className="bubble mx-auto mb-4 h-16 w-16 rounded-[22px]" style={{ background: 'var(--card-tint)', color: 'var(--primary)' }}>
                {icon}
            </div>
        )}
        <h3 className="heading">{title}</h3>
        {message && <p className="small mx-auto mt-1.5 max-w-xs">{message}</p>}
        {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
);
