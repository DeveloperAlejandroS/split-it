import { Home, LayoutGrid, NotebookText, PiggyBank, UserCircle2 } from 'lucide-react';
import { SideDrawer } from './SideDrawer';

const dockButtonClass = (isActive) =>
    `relative h-11 w-11 rounded-full border flex items-center justify-center transition-all active:scale-90 ${
        isActive
            ? 'border-transparent text-(--accent-contrast)'
            : 'border-white/10 bg-white/5 text-primary hover:bg-white/10'
    }`;

export const BottomIsland = ({
    activeTab,
    onCreateExpense,
    userEmail,
    onLogout,
    isHamburgerOpen,
    onHamburgerOpenChange,
    compact = false,
    theme = 'dark',
    onToggleTheme,
    onOpenHome,
    onOpenExpenses,
    onOpenFriends,
    onOpenPersonal,
    onOpenLibreta,
}) => {
    const handleExpensesShortcut = () => {
        onOpenExpenses?.();
    };

    const handleProfileMenu = () => {
        onHamburgerOpenChange(true);
    };

    return (
        <>
            <div className="xl:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-60 w-full px-4 sm:px-6 pointer-events-none">
                <div
                    className={`mx-auto pointer-events-auto w-fit rounded-full border px-2 py-2 glass-shell transition-all duration-300 ${
                        compact ? 'scale-95 opacity-85' : 'scale-100 opacity-100'
                    }`}
                    style={{ background: 'var(--surface)', borderColor: 'var(--surface-border)' }}
                >
                    {/* Simétrica alrededor de Inicio: 2 destinos a cada lado
                        + perfil. El botón de agregar ya no vive acá -- es
                        el FloatingAddButton, flotante y separado. */}
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handleExpensesShortcut}
                            className={dockButtonClass(activeTab === 'expenses')}
                            style={activeTab === 'expenses' ? { background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))' } : undefined}
                            aria-label="Ir a gastos"
                            title="Gastos"
                        >
                            <LayoutGrid size={17} />
                        </button>

                        <button
                            type="button"
                            onClick={onOpenPersonal}
                            className={dockButtonClass(activeTab === 'personal')}
                            style={activeTab === 'personal' ? { background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))' } : undefined}
                            aria-label="Gastos personales"
                            title="Gastos personales"
                        >
                            <PiggyBank size={17} />
                        </button>

                        <button
                            type="button"
                            onClick={onOpenHome}
                            className="h-13 w-13 rounded-full flex items-center justify-center transition-all active:scale-90"
                            style={{
                                background: 'linear-gradient(135deg, var(--brand), var(--brand-strong))',
                                color: 'var(--accent-contrast)',
                                boxShadow: '0 10px 24px -10px rgba(156, 77, 244, 0.6)',
                            }}
                            aria-label="Inicio"
                            title="Inicio"
                        >
                            <Home size={19} />
                        </button>

                        <button
                            type="button"
                            onClick={onOpenLibreta}
                            className={dockButtonClass(activeTab === 'libreta')}
                            style={activeTab === 'libreta' ? { background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))' } : undefined}
                            aria-label="Libreta"
                            title="Libreta"
                        >
                            <NotebookText size={17} />
                        </button>

                        <button
                            type="button"
                            onClick={handleProfileMenu}
                            className={dockButtonClass(false)}
                            aria-label="Abrir menú de cuenta"
                            title="Perfil y navegación"
                        >
                            <UserCircle2 size={19} />
                        </button>
                    </div>
                </div>
            </div>

            <SideDrawer
                isOpen={isHamburgerOpen}
                onOpenChange={onHamburgerOpenChange}
                theme={theme}
                onToggleTheme={onToggleTheme}
                onLogout={onLogout}
                onOpenHome={() => {
                    onHamburgerOpenChange(false);
                    onOpenHome?.();
                }}
                onOpenExpenses={() => {
                    onHamburgerOpenChange(false);
                    onOpenExpenses?.();
                }}
                onOpenFriends={() => {
                    onHamburgerOpenChange(false);
                    onOpenFriends?.();
                }}
                onOpenPersonal={() => {
                    onHamburgerOpenChange(false);
                    onOpenPersonal?.();
                }}
                onOpenLibreta={() => {
                    onHamburgerOpenChange(false);
                    onOpenLibreta?.();
                }}
                onCreateExpense={() => {
                    onHamburgerOpenChange(false);
                    onCreateExpense?.();
                }}
                userEmail={userEmail}
            />
        </>
    );
};
