import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { CurrencyInput } from './CurrencyInput';
import { API_URL } from '../config/api';

const TOKEN_KEY = 'splitit_jwt';

// Registrar una deuda nueva en la Libreta NO toca el presupuesto para
// nada — recién cuando se registre un abono (desde LibretaView) va a
// aparecer algo en Ingresos. Ver libretaController.js en el backend.
export const AddLibretaEntryModal = ({ isOpen, onClose, onCreated, theme = 'dark' }) => {
    const [debtorName, setDebtorName] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen) return;
        setDebtorName('');
        setDescription('');
        setAmount('');
        setError('');
    }, [isOpen]);
    /* eslint-enable react-hooks/set-state-in-effect */

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!debtorName.trim()) {
            setError('Ponle un nombre a quién te debe');
            return;
        }
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0) {
            setError('Ingresa un monto válido');
            return;
        }
        setIsSaving(true);
        setError('');
        try {
            const token = localStorage.getItem(TOKEN_KEY);
            const res = await fetch(`${API_URL}/libreta`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Accept: 'application/json' },
                body: JSON.stringify({
                    debtor_name: debtorName.trim(),
                    description: description.trim() || null,
                    amount_owed: value,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
            onCreated?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-95 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 sm:p-6"
            onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
            role="presentation"
        >
            <GlassCard theme={theme} strong className="relative w-full max-w-md rounded-4xl p-6 border border-white/10 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h4 className="text-base font-bold text-primary">Nueva deuda en tu Libreta</h4>
                        <p className="text-xs text-muted mt-0.5">Alguien que no usa Split.it te debe este dinero</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center shrink-0"
                        aria-label="Cerrar"
                    >
                        <X size={14} className="text-secondary" />
                    </button>
                </div>

                {error && (
                    <div className="mb-3 p-2.5 rounded-xl text-xs text-primary" style={{ background: 'var(--danger-soft)', border: '1px solid rgba(232,99,122,0.25)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                    <label className="block">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 block">¿Quién te debe?</span>
                        <input
                            autoFocus
                            value={debtorName}
                            onChange={(e) => setDebtorName(e.target.value)}
                            placeholder="Ej. Juan Pérez"
                            className="w-full bg-white/5 rounded-xl px-3 py-2.5 text-sm text-primary outline-none border border-transparent focus:border-(--accent)/50"
                        />
                    </label>
                    <label className="block">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 block">Motivo (opcional)</span>
                        <input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ej. Préstamo para la moto"
                            className="w-full bg-white/5 rounded-xl px-3 py-2.5 text-sm text-primary outline-none border border-transparent focus:border-(--accent)/50"
                        />
                    </label>
                    <label className="block">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1 block">Monto que te debe</span>
                        <CurrencyInput
                            value={amount}
                            onChange={setAmount}
                            className="w-full bg-white/5 rounded-xl px-3 py-2.5 text-sm text-primary outline-none border border-transparent focus:border-(--accent)/50 tabular"
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))', color: 'var(--accent-contrast)' }}
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                        Registrar deuda
                    </button>
                </form>
            </GlassCard>
        </div>
    );
};
