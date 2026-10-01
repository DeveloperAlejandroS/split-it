import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CircleNotch } from '@phosphor-icons/react';

// Confirmación para acciones destructivas o irreversibles. Se reserva para
// eso: usarla de más enseña a aceptar sin leer.
export const ConfirmDialog = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    tone = 'danger',
    isLoading = false,
    onConfirm,
    onCancel,
}) => {
    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') onCancel?.(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="sheet-backdrop flex items-center justify-center p-6"
            style={{ zIndex: 120 }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
            role="presentation"
        >
            <div role="alertdialog" aria-modal="true" aria-label={title} className="animate-materialize glass glass-strong w-full max-w-sm rounded-[28px] p-6 text-center">
                <h3 className="title">{title}</h3>
                {message && <p className="small mt-2">{message}</p>}
                <div className="mt-6 grid grid-cols-2 gap-3">
                    <button type="button" onClick={onCancel} disabled={isLoading} className="btn btn-gray">{cancelLabel}</button>
                    <button type="button" onClick={onConfirm} disabled={isLoading} className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}>
                        {isLoading ? <CircleNotch size={20} className="animate-spin" /> : confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
};
