import { LayoutGrid, Plus, UserCircle2 } from 'lucide-react';
import { SideDrawer } from './SideDrawer';

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
}) => {
    // FIX: left button → go to Expenses tab; right button → open SideDrawer (profile/menu).
    // Previously BOTH buttons opened the SideDrawer, making them identical with different icons.
    const handleExpensesShortcut = () => {
        onOpenExpenses?.();
    };

    const handleProfileMenu = () => {
        onHamburgerOpenChange(true);
    };

    return (
        <>
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 w-full px-4 sm:px-6 pointer-events-none">
                <div
                    className={`mx-auto pointer-events-auto max-w-100 rounded-full border px-3 py-3 glass-shell transition-all duration-300 ${
                        compact ? 'scale-95 opacity-85' : 'scale-100 opacity-100'
                    }`}
                    style={{ background: 'var(--surface)', borderColor: 'var(--surface-border)' }}
                >
                    <div className="grid grid-cols-[56px_1fr_56px] items-center gap-2">
                        {/*
                          LEFT: shortcut to Expenses tab.
                          Shows a subtle active ring when the user is on expenses.
                        */}
                        <button
                            type="button"
                            onClick={handleExpensesShortcut}
                            className="h-12 w-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-primary hover:bg-white/10 transition-all active:scale-90"
                            aria-label="Ir a gastos"
                            title="Gastos"
                        >
                            <LayoutGrid size={18} />
                        </button>

                        {/* CENTER: create expense — primary action */}
                        <button
                            onClick={onCreateExpense}
                            className="relative h-14 w-14 mx-auto rounded-full flex items-center justify-center text-white font-extrabold transition-all active:scale-95 shadow-2xl"
                            style={{
                                background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                                boxShadow: '0 18px 40px -14px rgba(139, 92, 246, 0.65)',
                            }}
                            aria-label="Añadir gasto"
                            title="Nuevo gasto"
                        >
                            <Plus size={22} />
                        </button>

                        {/*
                          RIGHT: opens SideDrawer (profile + navigation menu).
                          Changed icon meaning: UserCircle2 = profile/account, which is
                          semantically correct for opening the account drawer.
                        */}
                        <button
                            type="button"
                            onClick={handleProfileMenu}
                            className="h-12 w-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden hover:bg-white/10 transition-all active:scale-90"
                            aria-label="Abrir menú de cuenta"
                            title="Perfil y navegación"
                        >
                            <UserCircle2 size={20} className="text-primary" />
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
                onCreateExpense={() => {
                    onHamburgerOpenChange(false);
                    onCreateExpense?.();
                }}
                userEmail={userEmail}
            />
        </>
    );
};
