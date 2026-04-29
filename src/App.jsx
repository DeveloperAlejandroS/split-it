import { useCallback, useEffect, useMemo, useState } from 'react';
import { Coins, ShieldAlert, XCircle } from 'lucide-react';
import { BalanceCard } from './components/BalanceCard';
import { ExpenseList } from './components/ExpenseList';
import { FriendsView } from './components/FriendsView';
import { CreateExpenseForm } from './components/CreateExpenseForm';
import { ExpenseDetailModal } from './components/ExpenseDetailModal';
import { BottomIsland } from './components/BottomIsland';
import { LoginView } from './components/LoginView';
import { numberOrZero } from './utils/helpers';
import { purplePalette } from './utils/purplePalette';

const API_URL = 'https://expense-tracker-api-0762.onrender.com';
const TOKEN_KEY = 'splitit_jwt';

const App = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isBooting, setIsBooting] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [balance, setBalance] = useState({ owed_to_me: 0, i_owe: 0, net_balance: 0 });
    const [expenses, setExpenses] = useState([]);
    const [friends, setFriends] = useState([]);
    const [pendingFriendRequests, setPendingFriendRequests] = useState([]);
    const [error, setError] = useState('');
    const [showCreateExpense, setShowCreateExpense] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('expenses');
    const [expenseFilter, setExpenseFilter] = useState('all');
    const [theme, setTheme] = useState(() => localStorage.getItem('splitit_theme') || 'dark');
    const [isDockCompact, setIsDockCompact] = useState(false);

    const currentUserId = numberOrZero(currentUser?.id);

    // Force dark theme for now.
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

            const userData = await uR.json();
            const balanceData = await bR.json();
            const expensesData = await eR.json();
            const friendsData = await fR.json();
            const requestsData = await frqR.json();

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
                net_balance: numberOrZero(balanceData?.net_balance)
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

    const handleSettleExpense = async (expenseId, participant) => {
        const token = localStorage.getItem(TOKEN_KEY);
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/expenses/settle`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    expense_id: Number(expenseId),
                    user_id: Number(participant.user_id)
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || `Error ${response.status}`);
            await loadData(token);
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 5000);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem(TOKEN_KEY);
        setIsLoggedIn(false);
        setCurrentUser(null);
        setBalance({ owed_to_me: 0, i_owe: 0, net_balance: 0 });
        setExpenses([]);
        setSelectedExpense(null);
        setFriends([]);
        setPendingFriendRequests([]);
        setShowCreateExpense(false);
        setIsHamburgerOpen(false);
        setActiveTab('expenses');
        setExpenseFilter('all');
    };

    const handleOpenCreateExpense = () => {
        setIsHamburgerOpen(false);
        setShowCreateExpense(true);
    };

    const handleOpenExpenseDetail = useCallback((expense) => {
        setSelectedExpense(expense);
    }, []);

    const handleCloseExpenseDetail = useCallback(() => {
        setSelectedExpense(null);
    }, []);

    const handleHamburgerOpenChange = (nextOpen) => {
        if (nextOpen) {
            setShowCreateExpense(false);
        }
        setIsHamburgerOpen(nextOpen);
    };

    const tabButtonClass = (tabName) => (
        `flex-1 rounded-full px-4 py-3 text-sm font-semibold transition-all duration-300 ${
            activeTab === tabName
                ? 'bg-white text-slate-950 shadow-lg shadow-violet-500/20'
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
        <div className={`min-h-screen text-slate-100 font-sans ${purplePalette.selection} overflow-x-hidden transition-colors duration-500 animate-fade-in`} style={{ background: 'var(--app-bg)' }}>
            {/* Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] rounded-full blur-[120px]" style={{ background: 'rgba(139, 92, 246, 0.20)' }} />
                <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ background: 'rgba(168, 85, 247, 0.14)' }} />
            </div>

            {isHamburgerOpen && (
                <button
                    className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-sm"
                    onClick={() => setIsHamburgerOpen(false)}
                    aria-label="Cerrar menú"
                />
            )}

            {/* Error Alert */}
            {error && (
                <div className="fixed top-24 left-4 right-4 z-100 animate-in fade-in slide-in-from-top-4">
                    <div className="glass-shell-strong p-4 rounded-2xl shadow-2xl flex gap-3 items-center" style={{ color: 'var(--text-primary)' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(244, 63, 94, 0.18)', color: 'var(--danger)' }}>
                            <ShieldAlert size={16} />
                        </div>
                        <p className="flex-1 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{error}</p>
                        <button onClick={() => setError('')} className="p-2 text-secondary hover:text-primary transition-colors">
                            <XCircle size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <nav className="sticky top-0 z-50 px-4 py-4 backdrop-blur-xl border-b border-white/5" style={{ background: 'color-mix(in srgb, var(--app-bg) 58%, transparent)' }}>
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.28)' }}>
                            <Coins size={20} className="text-white" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Split.it</h1>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.26em]" style={{ color: 'var(--text-secondary)' }}>Command Center</span>
                </div>
            </nav>

            {/* Main Content */}
            <main className="mx-auto max-w-7xl px-4 sm:px-6 xl:px-8 pb-40 pt-8 animate-fade-up">
                <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.95fr)] items-start">
                    <section className="space-y-6 min-w-0">
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
                                    onSettle={handleSettleExpense}
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
                                onSettle={handleSettleExpense}
                                onOpenExpense={handleOpenExpenseDetail}
                                onRefresh={() => loadData(localStorage.getItem(TOKEN_KEY))}
                                isLoading={isLoading}
                                filter={expenseFilter}
                                theme={theme}
                            />
                        </div>
                    </section>

                    <aside className="hidden xl:block min-w-0 xl:sticky xl:top-24">
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
            />

            {/* Create Expense Modal */}
            <CreateExpenseForm
                isOpen={showCreateExpense}
                onClose={() => setShowCreateExpense(false)}
                onExpenseCreated={() => loadData(localStorage.getItem(TOKEN_KEY))}
                knownUsers={knownUsers}
                theme={theme}
            />

            <ExpenseDetailModal
                expense={selectedExpense}
                currentUserId={currentUserId}
                onClose={handleCloseExpenseDetail}
                onSettle={handleSettleExpense}
                isLoading={isLoading}
                theme={theme}
            />
        </div>
    );
};

export default App;