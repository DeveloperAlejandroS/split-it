import { useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { GlassCard } from './GlassCard';

// Modal genérico sí/no con el mismo estilo glass del resto de la app.
// Usado para confirmar borrado de gastos y para advertir que editar un
// gasto reinicia los estados de pago.
export const ConfirmDialog = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    tone = 'danger', // 'danger' | 'warning'
    isLoading = false,
    theme = 'dark',
    onConfirm,
    onCancel,
}) => {
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const isWarning = tone === 'warning';

    return (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 sm:p-6"
            onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
            role="presentation"
        >
            <GlassCard
                theme={theme}
                strong
                className="relative w-full max-w-sm rounded-4xl p-6 border border-white/10 animate-in fade-in zoom-in-95 duration-200"
            >
                <div className="flex items-start gap-3 mb-4">
                    <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                            isWarning
                                ? 'bg-(--info-soft) border-(--info)/25 text-(--info)'
                                : 'bg-(--danger-soft) border-(--danger)/25 text-(--danger)'
                        }`}
                    >
                        <AlertTriangle size={18} />
                    </div>
                    <div>
                        <h4 className="text-base font-bold text-primary">{title}</h4>
                        <p className="text-sm text-secondary mt-1">{message}</p>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1 bg-white/5 border border-white/10 text-primary font-bold py-3 rounded-2xl hover:bg-white/10 transition-all disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 text-white font-bold py-3 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                            isWarning ? 'bg-(--info) hover:brightness-95' : 'bg-(--danger) hover:brightness-95'
                        }`}
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                        {confirmLabel}
                    </button>
                </div>
            </GlassCard>
        </div>
    );
};
