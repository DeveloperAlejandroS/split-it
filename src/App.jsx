import { useCallback, useEffect, useMemo, useState } from 'react';
import { Coins, ShieldAlert, XCircle } from 'lucide-react';
import { BalanceCard } from './components/BalanceCard';
import { ExpenseList } from './components/ExpenseList';
import { FriendsView } from './components/FriendsView';
import { CreateExpenseForm } from './components/CreateExpenseForm';
import { ExpenseDetailModal } from './components/ExpenseDetailModal';
import { BottomIsland } from './components/BottomIsland';
import { Sidebar } from './components/Sidebar';
import { PersonalBudgetView } from './components/PersonalBudgetView';
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
    const [editingExpense, setEditingExpense] = useState(null);
    const [selectedExpenseId, setSelectedExpenseId] = useState(null);
    const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('expenses');
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
    const performExpenseAction = useCallback(async (path, method = 'PATCH') => {
        const token = localStorage.getItem(TOKEN_KEY);
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}${path}`, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
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
        (expenseId) => performExpenseAction(`/expenses/${expenseId}/claim`).catch(() => {}),
        [performExpenseAction],
    );

    const handleMarkPaid = useCallback(
        (expenseId, userId) => performExpenseAction(`/expenses/${expenseId}/participants/${userId}/mark-paid`).catch(() => {}),
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

    const tabButtonClass = (tabName) => (
        `flex-1 rounded-full px-4 py-3 text-sm font-semibold transition-all duration-300 ${
            activeTab === tabName
                ? 'bg-white text-slate-950 shadow-lg shadow-(--accent)/20'
                : 'text-white/55 hover:text-white hover:bg-white/5'
        }`
    );

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
                <div className="w-16 h-16 rounded-full animate-spin" style={{ border: '2px solid var(--surface-border)', borderTopColor: 'var(--accent)' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Coins size={20} style={{ color: 'var(--accent)' }} />
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
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] rounded-full blur-[120px]" style={{ background: 'rgba(212, 162, 78, 0.16)' }} />
                <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ background: 'rgba(111, 168, 220, 0.08)' }} />
            </div>

            <Sidebar
                activeTab={activeTab}
                onOpenExpenses={() => setActiveTab('expenses')}
                onOpenFriends={() => setActiveTab('friends')}
                onOpenPersonal={() => setActiveTab('personal')}
                onCreateExpense={handleOpenCreateExpense}
                onOpenAccount={() => setIsHamburgerOpen(true)}
                theme={theme}
                onToggleTheme={toggleTheme}
            />

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
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))', boxShadow: '0 0 20px rgba(212, 162, 78, 0.25)' }}>
                            <Coins size={20} style={{ color: 'var(--accent-contrast)' }} />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Split.it</h1>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="mx-auto max-w-6xl px-4 sm:px-6 xl:pl-28 xl:pr-8 pb-40 xl:pb-16 pt-8 xl:pt-10 animate-fade-up">
                {activeTab === 'personal' ? (
                    <PersonalBudgetView theme={theme} onViewSyncedExpense={(expenseId) => handleOpenExpenseDetail({ id: expenseId })} />
                ) : (
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,1fr)] items-start">
                        <section className="space-y-5 min-w-0">
                            <BalanceCard balance={balance} theme={theme} filter={expenseFilter} onFilterChange={setExpenseFilter} />

                            <section className="xl:hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('expenses')}
                                    className={tabButtonClass('expenses')}
                                >
                                    Gastos
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('friends')}
                                    className={tabButtonClass('friends')}
                                >
                                    Amigos
                                </button>
                            </section>

                            <div className="xl:hidden">
                                {activeTab === 'expenses' ? (
                                    <ExpenseList
                                        expenses={expenses}
                                        currentUserId={currentUserId}
                                        onOpenExpense={handleOpenExpenseDetail}
                                        onRefresh={() => loadData(localStorage.getItem(TOKEN_KEY))}
                                        isLoading={isLoading}
                                        filter={expenseFilter}
                                        theme={theme}
                                    />
                                ) : (
                                    <FriendsView
                                        friends={friends}
                                        pendingRequests={pendingFriendRequests}
                                        token={localStorage.getItem(TOKEN_KEY)}
                                        onRefresh={() => loadData(localStorage.getItem(TOKEN_KEY))}
                                        isLoading={isLoading}
                                        theme={theme}
                                    />
                                )}
                            </div>

                            <div className="hidden xl:block min-w-0">
                                <ExpenseList
                                    expenses={expenses}
                                    currentUserId={currentUserId}
                                    onOpenExpense={handleOpenExpenseDetail}
                                    onRefresh={() => loadData(localStorage.getItem(TOKEN_KEY))}
                                    isLoading={isLoading}
                                    filter={expenseFilter}
                                    theme={theme}
                                />
                            </div>
                        </section>

                        <aside className="hidden xl:block min-w-0 xl:sticky xl:top-10">
                            <FriendsView
                                friends={friends}
                                pendingRequests={pendingFriendRequests}
                                token={localStorage.getItem(TOKEN_KEY)}
                                onRefresh={() => loadData(localStorage.getItem(TOKEN_KEY))}
                                isLoading={isLoading}
                                theme={theme}
                            />
                        </aside>
                    </div>
                )}
            </main>

            <BottomIsland
                onCreateExpense={handleOpenCreateExpense}
                userEmail={currentUser?.email || 'User'}
                onLogout={handleLogout}
                isHamburgerOpen={isHamburgerOpen}
                onHamburgerOpenChange={handleHamburgerOpenChange}
                compact={isDockCompact}
                theme={theme}
                onToggleTheme={toggleTheme}
                onOpenExpenses={() => setActiveTab('expenses')}
                onOpenFriends={() => setActiveTab('friends')}
                onOpenPersonal={() => setActiveTab('personal')}
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
