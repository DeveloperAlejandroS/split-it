import { Coins, Home, LayoutGrid, MoonStar, NotebookText, PiggyBank, SunMedium, UserCircle2, Users } from 'lucide-react';

// Rail de navegación persistente para desktop. Reemplaza al dock flotante
// inferior (BottomIsland, que queda solo para mobile) — en pantallas anchas
// un dock centrado se sentía como una app móvil estirada; un rail lateral
// aprovecha el espacio vertical y deja el contenido principal más ancho.
export const Sidebar = ({
    activeTab,
    onOpenHome,
    onOpenExpenses,
    onOpenFriends,
    onOpenPersonal,
    onOpenLibreta,
    onOpenAccount,
    theme = 'dark',
    onToggleTheme,
}) => {
    const isLight = theme === 'light';

    const navItemClass = (tab) =>
        `h-11 w-11 rounded-2xl flex items-center justify-center transition-all ${
            activeTab === tab
                ? 'bg-(--accent-soft) text-(--accent)'
                : 'text-secondary hover:bg-white/5 hover:text-primary'
        }`;

    return (
        <aside
            className="hidden xl:flex fixed left-0 top-0 h-full w-20 flex-col items-center gap-6 py-6 z-40 border-r"
            style={{ background: 'var(--surface-strong)', borderColor: 'var(--surface-border)', backdropFilter: 'blur(20px)' }}
        >
            <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-strong))', boxShadow: '0 8px 20px -10px rgba(156, 77, 244, 0.5)' }}
            >
                <Coins size={18} style={{ color: 'var(--accent-contrast)' }} />
            </div>

            <nav className="flex flex-col items-center gap-2">
                <button type="button" onClick={onOpenHome} className={navItemClass('home')} aria-label="Inicio" title="Inicio">
                    <Home size={19} />
                </button>
                <button type="button" onClick={onOpenExpenses} className={navItemClass('expenses')} aria-label="Gastos" title="Gastos">
                    <LayoutGrid size={19} />
                </button>
                <button type="button" onClick={onOpenFriends} className={navItemClass('friends')} aria-label="Amigos" title="Amigos">
                    <Users size={19} />
                </button>

                <button
                    type="button"
                    onClick={onOpenPersonal}
                    className={navItemClass('personal')}
                    aria-label="Gastos personales"
                    title="Gastos personales"
                >
                    <PiggyBank size={19} />
                </button>

                <button
                    type="button"
                    onClick={onOpenLibreta}
                    className={navItemClass('libreta')}
                    aria-label="Libreta"
                    title="Libreta — deudas de gente que te debe a ti"
                >
                    <NotebookText size={19} />
                </button>
            </nav>

            <div className="mt-auto flex flex-col items-center gap-2">
                <button
                    type="button"
                    onClick={onToggleTheme}
                    className="h-11 w-11 rounded-2xl flex items-center justify-center text-secondary hover:bg-white/5 hover:text-primary transition-all"
                    aria-label="Cambiar tema"
                    title="Cambiar tema"
                >
                    {isLight ? <MoonStar size={18} /> : <SunMedium size={18} />}
                </button>
                <button
                    type="button"
                    onClick={onOpenAccount}
                    className="h-11 w-11 rounded-2xl flex items-center justify-center text-secondary hover:bg-white/5 hover:text-primary transition-all"
                    aria-label="Cuenta"
                    title="Cuenta"
                >
                    <UserCircle2 size={20} />
                </button>
            </div>
        </aside>
    );
};
