import { LayoutGrid, PiggyBank, Plus, UserCircle2 } from 'lucide-react';
import { SideDrawer } from './SideDrawer';

const dockButtonClass =
    'relative h-11 w-11 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-primary hover:bg-white/10 transition-all active:scale-90';

export const BottomIsland = ({
    onCreateExpense,
    userEmail,
    onLogout,
    isHamburgerOpen,
    onHamburgerOpenChange,
    compact = false,
    theme = 'dark',
    onToggleTheme,
    onOpenExpenses,
    onOpenFriends,
    onOpenPersonal,
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
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handleExpensesShortcut}
                            className={dockButtonClass}
                            aria-label="Ir a gastos"
                            title="Gastos"
                        >
                            <LayoutGrid size={17} />
                        </button>

                        <button
                            type="button"
                            onClick={onOpenPersonal}
                            className={dockButtonClass}
                            aria-label="Gastos personales"
                            title="Gastos personales"
                        >
                            <PiggyBank size={17} />
                        </button>

                        <button
                            onClick={onCreateExpense}
                            className="h-12 w-12 rounded-full flex items-center justify-center font-extrabold transition-all active:scale-95 shadow-2xl"
                            style={{
                                background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                                color: 'var(--accent-contrast)',
                                boxShadow: '0 18px 40px -14px rgba(212, 162, 78, 0.55)',
                            }}
                            aria-label="Añadir gasto"
                            title="Nuevo gasto"
                        >
                            <Plus size={20} />
                        </button>

                        <button
                            type="button"
                            onClick={handleProfileMenu}
                            className={dockButtonClass}
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
                onCreateExpense={() => {
                    onHamburgerOpenChange(false);
                    onCreateExpense?.();
                }}
                userEmail={userEmail}
            />
        </>
    );
};
