import { useState } from 'react';
import { SignOut } from '@phosphor-icons/react';
import { Sheet } from './ui/Sheet';
import { Avatar } from './ui/Avatar';
import { ConfirmDialog } from './ConfirmDialog';

const THEME_OPTIONS = [
    { id: 'system', label: 'Automático' },
    { id: 'light', label: 'Claro' },
    { id: 'dark', label: 'Oscuro' },
];

export const AccountSheet = ({ isOpen, onClose, user, themePref, onThemeChange, onLogout }) => {
    const [confirmLogout, setConfirmLogout] = useState(false);
    const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || user?.email || 'Tu cuenta';

    return (
        <>
            <Sheet isOpen={isOpen} onClose={onClose} title="Tu cuenta" closeLabel="Cerrar">
                <div className="hero flex items-center gap-4 p-5">
                    <Avatar name={name} size={64} />
                    <div className="min-w-0">
                        <p className="title truncate">{name}</p>
                        <p className="small truncate">{user?.email}</p>
                    </div>
                </div>

                <p className="heading px-1 pb-3 pt-6">Apariencia</p>
                <div className="segmented" role="group" aria-label="Apariencia">
                    {THEME_OPTIONS.map((opt) => (
                        <button key={opt.id} type="button" aria-pressed={themePref === opt.id} onClick={() => onThemeChange(opt.id)}>
                            {opt.label}
                        </button>
                    ))}
                </div>

                <button type="button" className="btn btn-danger btn-block mt-8" onClick={() => setConfirmLogout(true)}>
                    <SignOut size={20} weight="bold" />
                    Cerrar sesión
                </button>
            </Sheet>

            <ConfirmDialog
                isOpen={confirmLogout}
                tone="danger"
                title="¿Cerrar sesión?"
                message="Tus datos quedan guardados. Vuelves a entrar con tu usuario y contraseña."
                confirmLabel="Cerrar sesión"
                onConfirm={() => { setConfirmLogout(false); onClose(); onLogout(); }}
                onCancel={() => setConfirmLogout(false)}
            />
        </>
    );
};
