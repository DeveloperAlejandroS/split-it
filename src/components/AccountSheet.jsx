import { useState } from 'react';
import { Sheet } from './ui/Sheet';
import { Avatar } from './ui/Avatar';
import { ConfirmDialog } from './ConfirmDialog';

const THEME_OPTIONS = [
    { id: 'system', label: 'Automático' },
    { id: 'light', label: 'Claro' },
    { id: 'dark', label: 'Oscuro' },
];

// Perfil, apariencia y cerrar sesión: todo en un solo sheet. Reemplaza al
// menú lateral anterior, que mezclaba navegación (ya está en la barra),
// una card decorativa y el logout.
export const AccountSheet = ({ isOpen, onClose, user, themePref, onThemeChange, onLogout }) => {
    const [confirmLogout, setConfirmLogout] = useState(false);
    const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || user?.email || 'Tu cuenta';

    return (
        <>
            <Sheet isOpen={isOpen} onClose={onClose} title="Cuenta" closeLabel="Cerrar">
                <div className="flex flex-col items-center py-4 text-center">
                    <Avatar name={name} size={72} />
                    <p className="t-title mt-3">{name}</p>
                    <p className="t-subhead text-secondary">{user?.email}</p>
                </div>

                <p className="t-section px-4 pb-2 pt-2">Apariencia</p>
                <div className="segmented" role="group" aria-label="Apariencia">
                    {THEME_OPTIONS.map((opt) => (
                        <button key={opt.id} type="button" aria-pressed={themePref === opt.id} onClick={() => onThemeChange(opt.id)}>
                            {opt.label}
                        </button>
                    ))}
                </div>

                <div className="mt-6">
                    <button type="button" className="btn btn-danger btn-block" onClick={() => setConfirmLogout(true)}>
                        Cerrar sesión
                    </button>
                </div>
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
