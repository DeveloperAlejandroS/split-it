import { useEffect } from 'react';
import { LayoutGrid, MoonStar, NotebookText, PiggyBank, Plus, Settings2, SunMedium, UserCircle2, X } from 'lucide-react';

const drawerItemClass =
    'w-full flex items-center gap-4 rounded-3xl px-4 py-4 text-left transition-all duration-200 hover:bg-white/5 active:scale-[0.98]';

export const SideDrawer = ({
    isOpen,
    onOpenChange,
    theme,
    onToggleTheme,
    onLogout,
    onOpenExpenses,
    onOpenFriends,
    onOpenPersonal,
    onOpenLibreta,
    onCreateExpense,
    userEmail,
}) => {
    // FIX: Escape closes the drawer
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onOpenChange(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onOpenChange]);

    if (!isOpen) return null;

    const isLight = theme === 'light';

    return (
        <div className="fixed inset-0 z-120">
            {/* Backdrop */}
            <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => onOpenChange(false)}
                className="absolute inset-0 bg-slate-950/55 backdrop-blur-3xl"
            />

            {/*
              FIX: was using `animate-fade-up` (vertical) for a drawer that
              enters from the right. Changed to a horizontal slide-in using
              translate-x transition. The `animate-in` + `slide-in-from-right`
              Tailwind animation classes handle this if available; we use
              a manual style fallback that always works.
            */}
            <aside
                className="absolute right-0 top-0 h-full w-[min(100vw,420px)] glass-shell-strong border-l-0 rounded-l-[2.5rem] p-5 sm:p-6 flex flex-col gap-5"
                style={{
                    background: 'var(--surface-strong)',
                    animation: 'slideInFromRight 0.22s cubic-bezier(0.32, 0.72, 0, 1) both',
                }}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-secondary">Perfil</p>
                        <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-primary">Split.it</h3>
                        <p className="mt-2 text-sm text-secondary break-all">{userEmail}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="h-10 w-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-primary hover:bg-white/10 transition-all active:scale-90"
                        aria-label="Cerrar menú"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Nav items */}
                <div className="space-y-1">
                    <button type="button" onClick={onOpenExpenses} className={drawerItemClass}>
                        <span
                            className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
                            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                        >
                            <LayoutGrid size={20} />
                        </span>
                        <span className="flex-1">
                            <span className="block text-base font-semibold text-primary">Gastos</span>
                            <span className="block text-xs text-secondary">Volver al activity feed</span>
                        </span>
                    </button>

                    <button type="button" onClick={onOpenFriends} className={drawerItemClass}>
                        <span
                            className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
                            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                        >
                            <UserCircle2 size={20} />
                        </span>
                        <span className="flex-1">
                            <span className="block text-base font-semibold text-primary">Amigos</span>
                            <span className="block text-xs text-secondary">Solicitudes y contactos</span>
                        </span>
                    </button>

                    <button type="button" onClick={onOpenPersonal} className={drawerItemClass}>
                        <span
                            className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
                            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                        >
                            <PiggyBank size={20} />
                        </span>
                        <span className="flex-1">
                            <span className="block text-base font-semibold text-primary">Gastos personales</span>
                            <span className="block text-xs text-secondary">Tu presupuesto mensual</span>
                        </span>
                    </button>

                    <button type="button" onClick={onOpenLibreta} className={drawerItemClass}>
                        <span
                            className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
                            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                        >
                            <NotebookText size={20} />
                        </span>
                        <span className="flex-1">
                            <span className="block text-base font-semibold text-primary">Libreta</span>
                            <span className="block text-xs text-secondary">Deudas de gente que te debe a ti</span>
                        </span>
                    </button>

                    <button type="button" onClick={onCreateExpense} className={drawerItemClass}>
                        <span
                            className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
                            style={{
                                background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                                color: 'white',
                            }}
                        >
                            <Plus size={20} />
                        </span>
                        <span className="flex-1">
                            <span className="block text-base font-semibold text-primary">Nuevo gasto</span>
                            <span className="block text-xs text-secondary">Crear una división rápida</span>
                        </span>
                    </button>

                    <button type="button" onClick={onToggleTheme} className={drawerItemClass}>
                        <span
                            className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
                            style={{ background: 'var(--surface-soft)', color: 'var(--text-primary)' }}
                        >
                            {isLight ? <MoonStar size={20} /> : <SunMedium size={20} />}
                        </span>
                        <span className="flex-1">
                            <span className="block text-base font-semibold text-primary">Tema</span>
                            <span className="block text-xs text-secondary">{isLight ? 'Cambiar a oscuro' : 'Cambiar a claro'}</span>
                        </span>
                        <span className="theme-switch" data-active={isLight} aria-hidden="true">
                            <span className="theme-switch-thumb" />
                        </span>
                    </button>
                </div>

                {/* Footer */}
                <div className="mt-auto space-y-3">
                    <div className="rounded-3xl p-4 border border-white/10 bg-white/5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-secondary mb-2">
                            Acciones rápidas
                        </p>
                        <div className="flex items-center gap-3 text-sm text-secondary">
                            <Settings2 size={16} />
                            <span>Diseño glass, navegación compacta y temas.</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            onOpenChange(false);
                            onLogout();
                            localStorage.clear();
                        }}
                        className="w-full rounded-3xl px-4 py-4 text-sm font-semibold transition-all border border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15 active:scale-[0.98]"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* Keyframe injected inline so it works without extra CSS files */}
            <style>{`
                @keyframes slideInFromRight {
                    from { transform: translateX(100%); opacity: 0.5; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
            `}</style>
        </div>
    );
};
