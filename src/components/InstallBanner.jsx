import { useState } from 'react';
import { DeviceMobile, Export, PlusSquare, X } from '@phosphor-icons/react';
import { Sheet } from './ui/Sheet';
import { useInstall } from '../utils/useInstall';

// Pasos para iPhone: allí no existe un botón de instalar, hay que hacerlo a
// mano desde Safari.
export const IosInstallSheet = ({ isOpen, onClose }) => (
    <Sheet isOpen={isOpen} onClose={onClose} title="Instalar en iPhone" closeLabel="Cerrar">
        <p className="small px-1">Split.it se instala desde Safari y queda como una app: pantalla completa, ícono propio y notificaciones.</p>
        <ol className="stack mt-4">
            <li className="row">
                <span className="bubble h-11 w-11 rounded-full" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}><Export size={22} weight="bold" /></span>
                <span className="body flex-1">Toca <strong>Compartir</strong> en la barra de Safari.</span>
            </li>
            <li className="row">
                <span className="bubble h-11 w-11 rounded-full" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}><PlusSquare size={22} weight="bold" /></span>
                <span className="body flex-1">Elige <strong>Agregar a pantalla de inicio</strong>.</span>
            </li>
            <li className="row">
                <span className="bubble h-11 w-11 rounded-full" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}><DeviceMobile size={22} weight="bold" /></span>
                <span className="body flex-1">Abre Split.it desde el ícono nuevo e inicia sesión.</span>
            </li>
        </ol>
        <p className="tiny px-1 pt-3">Si usas Chrome u otro navegador en el iPhone, abre esta página en Safari primero.</p>
    </Sheet>
);

// Invitación a instalar, en Inicio. Se puede cerrar y no vuelve a salir (la
// opción queda en Ajustes).
export const InstallBanner = () => {
    const { mode, dismissed, install, dismiss } = useInstall();
    const [showIos, setShowIos] = useState(false);

    if (!mode || dismissed) return null;

    return (
        <>
            <div className="card animate-fade-up mb-5 flex items-center gap-3 p-3 pl-4">
                <span className="bubble h-11 w-11 shrink-0 rounded-full" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}><DeviceMobile size={22} weight="duotone" /></span>
                <span className="min-w-0 flex-1">
                    <span className="body block font-semibold">Instala Split.it</span>
                    <span className="small block">Ábrela como app, a pantalla completa.</span>
                </span>
                <button type="button" className="btn btn-primary btn-sm shrink-0" onClick={() => (mode === 'prompt' ? install() : setShowIos(true))}>
                    {mode === 'prompt' ? 'Instalar' : 'Cómo'}
                </button>
                <button type="button" onClick={dismiss} aria-label="Ahora no" className="flex h-11 w-9 shrink-0 items-center justify-center" style={{ color: 'var(--ink-3)' }}>
                    <X size={16} weight="bold" />
                </button>
            </div>
            <IosInstallSheet isOpen={showIos} onClose={() => setShowIos(false)} />
        </>
    );
};

// Aviso fijo cuando no hay internet: los datos en pantalla pueden estar viejos
// y guardar va a fallar.
export const OfflineNotice = ({ offline }) => (offline ? (
    <div role="status" className="glass glass-strong fixed left-1/2 z-[105] -translate-x-1/2 rounded-full px-4 py-2 small animate-materialize" style={{ top: 'calc(var(--safe-top) + 12px)', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
        Sin conexión. Los cambios no se guardarán.
    </div>
) : null);
