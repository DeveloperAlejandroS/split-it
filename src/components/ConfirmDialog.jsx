import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';

// Alerta estilo iOS: tarjeta translúcida centrada con botones a ancho
// completo separados por filetes. Se reserva para acciones destructivas
// o irreversibles -- usarla de más enseña a la gente a aceptar sin leer.
export const ConfirmDialog = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    tone = 'danger', // 'danger' | 'warning' | 'default'
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

    const confirmColor = tone === 'danger' ? 'var(--danger)' : 'var(--accent)';

    return createPortal(
        <div
            className="sheet-backdrop flex items-center justify-center p-8"
            style={{ zIndex: 120 }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
            role="presentation"
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-label={title}
                className="animate-pop-in material w-full max-w-[280px] overflow-hidden rounded-[18px] border text-center"
                style={{ background: 'var(--material)' }}
            >
                <div className="px-4 pb-4 pt-5">
                    <h3 className="t-headline">{title}</h3>
                    {message && <p className="t-footnote mt-1 text-secondary">{message}</p>}
                </div>
                <div className="grid grid-cols-2" style={{ borderTop: '0.5px solid var(--separator)' }}>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="h-11 text-[17px] transition-colors active:bg-(--fill)"
                        style={{ color: 'var(--accent)', borderRight: '0.5px solid var(--separator)' }}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="h-11 text-[17px] font-semibold transition-colors active:bg-(--fill) disabled:opacity-50"
                        style={{ color: confirmColor }}
                    >
                        {isLoading ? <Loader2 size={18} className="mx-auto animate-spin" /> : confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
};
