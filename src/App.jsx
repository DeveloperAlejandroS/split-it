import { useCallback, useEffect, useMemo, useState } from 'react';
import { Coins, ShieldAlert, XCircle } from 'lucide-react';
import { BalanceCard } from './components/BalanceCard';
import { ExpenseList } from './components/ExpenseList';
import { FriendsView } from './components/FriendsView';
import { HomeView } from './components/HomeView';
import { FloatingAddButton } from './components/FloatingAddButton';
import { CreateExpenseForm } from './components/CreateExpenseForm';
import { ExpenseDetailModal } from './components/ExpenseDetailModal';
import { BottomIsland } from './components/BottomIsland';
import { Sidebar } from './components/Sidebar';
import { PersonalBudgetView } from './components/PersonalBudgetView';
import { AddBudgetItemModal } from './components/AddBudgetItemModal';
import { LibretaView } from './components/LibretaView';
import { AddLibretaEntryModal } from './components/AddLibretaEntryModal';
import { LoginView } from './components/LoginView';
import { numberOrZero } from './utils/helpers';
import { brandPalette } from './utils/brandPalette';
import { API_URL } from './config/api';

const TOKEN_KEY = 'splitit_jwt';

const App = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isBooting, setIsBooting] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [balance, setBalance] = useState({ owed_to_me: 0, i_owe: 0, net_balance: 0, by_friend: [] });
    const [expenses, setExpenses] = useState([]);
    const [friends, setFriends] = useState([]);
    const [pendingFriendRequests, setPendingFriendRequests] = useState([]);
    const [error, setError] = useState('');
    const [showCreateExpense, setShowCreateExpense] = useState(false);
    const [showAddBudgetItem, setShowAddBudgetItem] = useState(false);
    const [budgetRefreshKey, setBudgetRefreshKey] = useState(0);
    const [showAddLibretaEntry, setShowAddLibretaEntry] = useState(false);
    const [libretaRefreshKey, setLibretaRefreshKey] = useState(0);
    const [editingExpense, setEditingExpense] = useState(null);
    const [selectedExpenseId, setSelectedExpenseId] = useState(null);
    const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('home');
    const [expenseFilter, setExpenseFilter] = useState('all');
    const [theme, setTheme] = useState(() => localStorage.getItem('splitit_theme') || 'light');
    const [isDockCompact, setIsDockCompact] = useState(false);

    const currentUserId = numberOrZero(currentUser?.id);

    useEffect(() => {
        const root = document.documentElement;
        root.dataset.theme = theme;
        root.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('splitit_theme', theme);
    }, [theme]);

    useEffect(() => {
        const handleScroll = () => {
            setIsDockCompact(window.scrollY > 24);
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
    }, []);

    const loadData = useCallback(async (token) => {
        setIsLoading(true);
        try {
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            };
            const [uR, bR, eR, fR, frqR] = await Promise.all([
                fetch(`${API_URL}/auth/me`, { headers }),
                fetch(`${API_URL}/expenses/balance`, { headers }),
                fetch(`${API_URL}/expenses`, { headers }),
                fetch(`${API_URL}/friends`, { headers }),
                fetch(`${API_URL}/friends/requests`, { headers })
            ]);

            if (uR.status === 401) throw new Error('Sesión expirada');

            const [userData, balanceData, expensesData, friendsData, requestsData] = await Promise.all([
                uR.json(), bR.json(), eR.json(), fR.json(), frqR.json()
            ]);

            const failedLabels = [
                !uR.ok && 'perfil',
                !bR.ok && 'balance',
                !eR.ok && 'gastos',
                !fR.ok && 'amigos',
                !frqR.ok && 'solicitudes',
            ].filter(Boolean);

            if (failedLabels.length > 0) {
                throw new Error(`No se pudo cargar: ${failedLabels.join(', ')}`);
            }

            const rawFriends = Array.isArray(friendsData?.friends)
                ? friendsData.friends
                : Array.isArray(friendsData)
                    ? friendsData
                    : [];

            const rawPendingRequests = Array.isArray(requestsData?.requests)
                ? requestsData.requests
                : Array.isArray(requestsData?.friends)
                    ? requestsData.friends
                    : Array.isArray(requestsData)
                        ? requestsData
                        : [];

            setCurrentUser(userData.user);
            setBalance({
                owed_to_me: numberOrZero(balanceData?.owed_to_me),
                i_owe: numberOrZero(balanceData?.i_owe),
                net_balance: numberOrZero(balanceData?.net_balance),
                by_friend: Array.isArray(balanceData?.by_friend)
                    ? balanceData.by_friend.map((f) => ({
                        ...f,
                        owed_to_me: numberOrZero(f?.owed_to_me),
                        i_owe: numberOrZero(f?.i_owe),
                        net: numberOrZero(f?.net),
                    }))
                    : [],
            });
            setExpenses(Array.isArray(expensesData.expenses) ? expensesData.expenses : []);
            setFriends(rawFriends);
            setPendingFriendRequests(rawPendingRequests);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Wrapper compartido por las acciones de liquidación/edición/borrado de
    // gastos: hace el fetch autenticado, refresca los datos si sale bien, y
    // deja el error visible en el banner si falla.
    const performExpenseAction = useCallback(async (path, method = 'PATCH', body = null) => {
        const token = localStorage.getItem(TOKEN_KEY);
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}${path}`, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    ...(body ? { 'Content-Type': 'application/json' } : {}),
                },
                ...(body ? { body: JSON.stringify(body) } : {}),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || `Error ${response.status}`);
            await loadData(token);
            return data;
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 5000);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [loadData]);

    const handleClaimPaid = useCallback(
        (expenseId, amount) => performExpenseAction(`/expenses/${expenseId}/claim`, 'PATCH', amount ? { amount } : null).catch(() => {}),
        [performExpenseAction],
    );

    const handleMarkPaid = useCallback(
        (expenseId, userId, amount) => performExpenseAction(`/expenses/${expenseId}/participants/${userId}/mark-paid`, 'PATCH', amount ? { amount } : null).catch(() => {}),
        [performExpenseAction],
    );

    const handleConfirmPayment = useCallback(
        (expenseId, userId) => performExpenseAction(`/expenses/${expenseId}/participants/${userId}/confirm`).catch(() => {}),
        [performExpenseAction],
    );

    const handleRejectPayment = useCallback(
        (expenseId, userId) => performExpenseAction(`/expenses/${expenseId}/participants/${userId}/reject`).catch(() => {}),
        [performExpenseAction],
    );

    const handleDeleteExpense = useCallback(
        async (expense) => {
            try {
                await performExpenseAction(`/expenses/${expense.id}`, 'DELETE');
                setSelectedExpenseId(null);
            } catch {
                // El error ya quedó en el banner via performExpenseAction.
            }
        },
        [performExpenseAction],
    );

    const handleEditExpense = useCallback((expense) => {
        setSelectedExpenseId(null);
        setEditingExpense(expense);
        setShowCreateExpense(true);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem(TOKEN_KEY);
        setIsLoggedIn(false);
        setCurrentUser(null);
        setBalance({ owed_to_me: 0, i_owe: 0, net_balance: 0, by_friend: [] });
        setExpenses([]);
        setSelectedExpenseId(null);
        setFriends([]);
        setPendingFriendRequests([]);
        setShowCreateExpense(false);
        setEditingExpense(null);
        setIsHamburgerOpen(false);
        setActiveTab('expenses');
        setExpenseFilter('all');
    };

    const handleOpenCreateExpense = () => {
        setIsHamburgerOpen(false);
        setEditingExpense(null);
        setShowCreateExpense(true);
    };

    // Botón de agregar contextual: en "Gastos personales" abre el picker de
    // categorías del presupuesto, en "Libreta" abre el formulario de deuda
    // nueva, y en cualquier otro lado abre el formulario de gasto compartido.
    const handleContextualAdd = () => {
        if (activeTab === 'personal') {
            setShowAddBudgetItem(true);
        } else if (activeTab === 'libreta') {
            setShowAddLibretaEntry(true);
        } else {
            handleOpenCreateExpense();
        }
    };

    const handleBudgetItemCreated = () => {
        setShowAddBudgetItem(false);
        setBudgetRefreshKey((k) => k + 1);
    };

    const handleLibretaEntryCreated = () => {
        setShowAddLibretaEntry(false);
        setLibretaRefreshKey((k) => k + 1);
    };

    const handleCloseCreateExpense = useCallback(() => {
        setShowCreateExpense(false);
        setEditingExpense(null);
    }, []);

    // Guardamos solo el id y derivamos el expense actual desde `expenses` en
    // cada render, así el modal de detalle siempre refleja el estado más
    // reciente después de una acción (marcar pagado, confirmar, editar...).
    const handleOpenExpenseDetail = useCallback((expense) => {
        setSelectedExpenseId(expense.id);
    }, []);

    const handleCloseExpenseDetail = useCallback(() => {
        setSelectedExpenseId(null);
    }, []);

    const selectedExpense = useMemo(
        () => expenses.find((e) => e.id === selectedExpenseId) || null,
        [expenses, selectedExpenseId],
    );

    const handleHamburgerOpenChange = (nextOpen) => {
        if (nextOpen) {
            setShowCreateExpense(false);
        }
        setIsHamburgerOpen(nextOpen);
    };

    const knownUsers = useMemo(() => {
        const usersById = new Map();

        const mergeUser = (rawUser, explicitId) => {
            const id = numberOrZero(explicitId ?? rawUser?.id ?? rawUser?.user_id);
            if (!id) return;

            const prev = usersById.get(id) || {};
            const firstName = String(rawUser?.first_name || '').trim();
            const middleName = String(rawUser?.middle_name || '').trim();
            const lastName = String(rawUser?.last_name || '').trim();
            const secondLastName = String(rawUser?.second_last_name || '').trim();
            const nameParts = [firstName, middleName, lastName, secondLastName].filter(Boolean);

            usersById.set(id, {
                id,
                username: String(rawUser?.username || prev?.username || '').trim(),
                email: String(rawUser?.email || prev?.email || '').trim(),
                phone: String(rawUser?.phone || prev?.phone || '').trim(),
                displayName: nameParts.join(' ') || String(rawUser?.username || prev?.username || rawUser?.email || prev?.email || '').trim()
            });
        };

        if (currentUser?.id != null) {
            mergeUser(currentUser, currentUser.id);
        }

        expenses.forEach((expense) => {
            const paidBy = expense?.paid_by;
            if (paidBy && typeof paidBy === 'object') {
                mergeUser(paidBy, paidBy.id);
            }

            (Array.isArray(expense?.participants) ? expense.participants : []).forEach((participant) => {
                mergeUser(participant, participant?.user_id);
            });
        });

        friends.forEach((friend) => {
            const user = friend?.user || friend?.friend || friend?.profile || friend;
            mergeUser(user, user?.id ?? friend?.user_id ?? friend?.friend_id);
        });

        return Array.from(usersById.values()).filter((user) => user.id !== currentUserId);
    }, [currentUser, currentUserId, expenses, friends]);

    useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsLoggedIn(true);
            loadData(token).finally(() => setIsBooting(false));
        } else {
            setIsBooting(false);
        }
    }, [loadData]);

    if (isBooting) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 animate-fade-in text-primary" style={{ background: 'var(--app-bg)' }}>
            <div className="relative">
                <div className="w-16 h-16 rounded-full animate-spin" style={{ border: '2px solid var(--surface-border)', borderTopColor: 'var(--brand)' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Coins size={20} style={{ color: 'var(--brand)' }} />
                </div>
            </div>
            <span className="text-secondary font-bold tracking-[0.22em] text-[10px] uppercase">Split.it</span>
        </div>
    );

    if (!isLoggedIn) {
        return <LoginView theme={theme} onToggleTheme={toggleTheme} onAuth={() => setIsLoggedIn(true)} loadData={loadData} />;
    }

    return (
        <div className={`min-h-screen text-slate-100 font-sans ${brandPalette.selection} overflow-x-hidden transition-colors duration-500 animate-fade-in`} style={{ background: 'var(--app-bg)' }}>
            {/* Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] rounded-full blur-[120px]" style={{ background: 'rgba(232, 24, 156, 0.16)' }} />
                <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ background: 'rgba(111, 168, 220, 0.08)' }} />
            </div>

            <Sidebar
                activeTab={activeTab}
                onOpenHome={() => setActiveTab('home')}
                onOpenExpenses={() => setActiveTab('expenses')}
                onOpenFriends={() => setActiveTab('friends')}
                onOpenPersonal={() => setActiveTab('personal')}
                onOpenLibreta={() => setActiveTab('libreta')}
                onOpenAccount={() => setIsHamburgerOpen(true)}
                theme={theme}
                onToggleTheme={toggleTheme}
            />

            <FloatingAddButton activeTab={activeTab} onClick={handleContextualAdd} />

            {isHamburgerOpen && (
                <button
                    className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-sm"
                    onClick={() => setIsHamburgerOpen(false)}
                    aria-label="Cerrar menú"
                />
            )}

            {/* Error Alert */}
            {error && (
                <div className="fixed top-24 left-4 right-4 xl:left-28 z-100 animate-in fade-in slide-in-from-top-4">
                    <div className="glass-shell-strong p-4 rounded-2xl shadow-2xl flex gap-3 items-center max-w-xl mx-auto xl:mx-0" style={{ color: 'var(--text-primary)' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                            <ShieldAlert size={16} />
                        </div>
                        <p className="flex-1 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{error}</p>
                        <button onClick={() => setError('')} className="p-2 text-secondary hover:text-primary transition-colors">
                            <XCircle size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Header — only on mobile/tablet; the sidebar carries the identity on desktop */}
            <nav className="xl:hidden sticky top-0 z-50 px-4 py-4 backdrop-blur-xl border-b border-white/5" style={{ background: 'color-mix(in srgb, var(--app-bg) 58%, transparent)' }}>
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-strong))', boxShadow: '0 0 20px rgba(156, 77, 244, 0.3)' }}>
                            <Coins size={20} style={{ color: 'var(--accent-contrast)' }} />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Split.it</h1>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            {/* Gastos personales tiene 3 columnas de tablas (Ingresos/Deudas/
                Ahorros + Gastos Fijos + Seguimiento) — con el mismo ancho que
                el resto de la app quedaban tan angostas que los montos se
                veían apretados/cortados. Le damos más aire ahí solamente. */}
            <main className={`mx-auto px-4 sm:px-6 xl:pl-28 xl:pr-8 pb-40 xl:pb-16 pt-8 xl:pt-10 animate-fade-up ${
                activeTab === 'personal' ? 'max-w-[105rem]' : activeTab === 'home' ? 'max-w-4xl' : 'max-w-6xl'
            }`}>
                {activeTab === 'home' ? (
                    <HomeView
                        theme={theme}
                        currentUser={currentUser}
                        expenses={expenses}
                        friends={friends}
                        pendingFriendRequests={pendingFriendRequests}
                        balance={balance}
                        onOpenSplit={() => setActiveTab('expenses')}
                        onOpenBudget={() => setActiveTab('personal')}
                        onOpenAccounts={() => setActiveTab('libreta')}
                        onOpenFriends={() => setActiveTab('friends')}
                    />
                ) : activeTab === 'personal' ? (
                    <PersonalBudgetView
                        key={budgetRefreshKey}
                        theme={theme}
                        splitBalance={balance}
                        onViewSyncedExpense={(expenseId) => handleOpenExpenseDetail({ id: expenseId })}
                        onViewLibreta={() => setActiveTab('libreta')}
                        onViewSplit={() => setActiveTab('expenses')}
                    />
                ) : activeTab === 'libreta' ? (
                    <LibretaView key={libretaRefreshKey} theme={theme} />
                ) : activeTab === 'friends' ? (
                    // Amigos es su propia pantalla, igual que Personal/Libreta -- ya
                    // no vive como panel lateral pegado a Gastos. Gestionar contactos
                    // y ver el split de un gasto son dos tareas distintas.
                    <FriendsView
                        friends={friends}
                        pendingRequests={pendingFriendRequests}
                        token={localStorage.getItem(TOKEN_KEY)}
                        onRefresh={() => loadData(localStorage.getItem(TOKEN_KEY))}
                        isLoading={isLoading}
                        theme={theme}
                        onViewExpenses={() => setActiveTab('expenses')}
                    />
                ) : (
                    <section className="space-y-5 min-w-0 max-w-3xl mx-auto xl:mx-0">
                        <BalanceCard balance={balance} theme={theme} filter={expenseFilter} onFilterChange={setExpenseFilter} />
                        <ExpenseList
                            expenses={expenses}
                            currentUserId={currentUserId}
                            onOpenExpense={handleOpenExpenseDetail}
                            onRefresh={() => loadData(localStorage.getItem(TOKEN_KEY))}
                            isLoading={isLoading}
                            filter={expenseFilter}
                            theme={theme}
                        />
                    </section>
                )}
            </main>

            <BottomIsland
                activeTab={activeTab}
                onCreateExpense={handleContextualAdd}
                userEmail={currentUser?.email || 'User'}
                onLogout={handleLogout}
                isHamburgerOpen={isHamburgerOpen}
                onHamburgerOpenChange={handleHamburgerOpenChange}
                compact={isDockCompact}
                theme={theme}
                onToggleTheme={toggleTheme}
                onOpenHome={() => setActiveTab('home')}
                onOpenExpenses={() => setActiveTab('expenses')}
                onOpenFriends={() => setActiveTab('friends')}
                onOpenPersonal={() => setActiveTab('personal')}
                onOpenLibreta={() => setActiveTab('libreta')}
            />

            {/* Create / Edit Expense Modal */}
            <CreateExpenseForm
                isOpen={showCreateExpense}
                mode={editingExpense ? 'edit' : 'create'}
                initialExpense={editingExpense}
                onClose={handleCloseCreateExpense}
                onSuccess={() => loadData(localStorage.getItem(TOKEN_KEY))}
                knownUsers={knownUsers}
                currentUserId={currentUserId}
                theme={theme}
            />

            <AddBudgetItemModal
                isOpen={showAddBudgetItem}
                onClose={() => setShowAddBudgetItem(false)}
                onCreated={handleBudgetItemCreated}
                theme={theme}
            />

            <AddLibretaEntryModal
                isOpen={showAddLibretaEntry}
                onClose={() => setShowAddLibretaEntry(false)}
                onCreated={handleLibretaEntryCreated}
                theme={theme}
            />

            <ExpenseDetailModal
                expense={selectedExpense}
                currentUserId={currentUserId}
                onClose={handleCloseExpenseDetail}
                onClaim={handleClaimPaid}
                onMarkPaid={handleMarkPaid}
                onConfirmPayment={handleConfirmPayment}
                onRejectPayment={handleRejectPayment}
                onEdit={handleEditExpense}
                onDelete={handleDeleteExpense}
                isLoading={isLoading}
                theme={theme}
            />
        </div>
    );
};

export default App;
