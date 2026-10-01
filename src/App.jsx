import { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { Logo } from './components/ui/Logo';
import { ExpensesView } from './components/ExpensesView';
import { FriendsView } from './components/FriendsView';
import { HomeView } from './components/HomeView';
import { AccountsView } from './components/AccountsView';
import { BudgetView } from './components/BudgetView';
import { CreateExpenseSheet } from './components/CreateExpenseSheet';
import { ExpenseDetailSheet } from './components/ExpenseDetailSheet';
import { AddBudgetItemModal } from './components/AddBudgetItemModal';
import { AddLedgerEntrySheet } from './components/LedgerSheets';
import { AddMenuSheet } from './components/AddMenuSheet';
import { AccountSheet } from './components/AccountSheet';
import { TabBar } from './components/TabBar';
import { Sidebar } from './components/Sidebar';
import { LoginView } from './components/LoginView';
import { displayNameOf, numberOrZero } from './utils/helpers';
import { API_URL } from './config/api';

const TOKEN_KEY = 'splitit_jwt';
const THEME_KEY = 'splitit_theme_pref';
const TABS = ['home', 'expenses', 'personal', 'accounts', 'friends'];
const EMPTY_BALANCE = { owed_to_me: 0, i_owe: 0, net_balance: 0, by_friend: [] };

const tabFromHash = () => {
    const id = window.location.hash.replace('#', '');
    return TABS.includes(id) ? id : 'home';
};

const systemTheme = () => (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

const App = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isBooting, setIsBooting] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [balance, setBalance] = useState(EMPTY_BALANCE);
    const [expenses, setExpenses] = useState([]);
    const [friends, setFriends] = useState([]);
    const [pendingFriendRequests, setPendingFriendRequests] = useState([]);
    const [toast, setToast] = useState('');

    const [activeTab, setActiveTabState] = useState(tabFromHash);
    const [expenseFilter, setExpenseFilter] = useState('all');
    const [accountsSegment, setAccountsSegment] = useState('owed');
    const [dataVersion, setDataVersion] = useState(0);

    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showCreateExpense, setShowCreateExpense] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [showAddBudgetItem, setShowAddBudgetItem] = useState(false);
    const [budgetSection, setBudgetSection] = useState(null);
    const [showAddLedger, setShowAddLedger] = useState(false);
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [showAccount, setShowAccount] = useState(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState(null);

    const [themePref, setThemePref] = useState(() => localStorage.getItem(THEME_KEY) || 'system');
    const [systemIsDark, setSystemIsDark] = useState(() => systemTheme() === 'dark');
    const theme = themePref === 'system' ? (systemIsDark ? 'dark' : 'light') : themePref;

    const currentUserId = numberOrZero(currentUser?.id);

    // ---- Tema: automático por defecto, como iOS --------------------------
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = (e) => setSystemIsDark(e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        root.dataset.theme = theme;
        root.classList.toggle('dark', theme === 'dark');
        localStorage.setItem(THEME_KEY, themePref);
        // La barra de estado del teléfono toma este color: debe coincidir con
        // lo que hay arriba de la pantalla, no con el color de marca.
        document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', theme === 'dark' ? '#000000' : '#f2f2f7'));
    }, [theme, themePref]);

    // ---- Navegación: la pestaña vive en el hash (el botón atrás funciona) -
    const setActiveTab = useCallback((tab) => {
        setActiveTabState((current) => {
            if (current !== tab) window.history.pushState(null, '', `#${tab}`);
            return tab;
        });
        window.scrollTo({ top: 0 });
    }, []);

    useEffect(() => {
        const onPop = () => setActiveTabState(tabFromHash());
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    // ---- Errores: aviso temporal arriba, con cierre manual ----------------
    const showToast = useCallback((message) => {
        setToast(message);
    }, []);

    useEffect(() => {
        if (!toast) return undefined;
        const t = setTimeout(() => setToast(''), 6000);
        return () => clearTimeout(t);
    }, [toast]);

    // ---- Datos -----------------------------------------------------------
    const loadData = useCallback(async (token) => {
        setIsLoading(true);
        try {
            const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
            const responses = await Promise.all([
                fetch(`${API_URL}/auth/me`, { headers }),
                fetch(`${API_URL}/expenses/balance`, { headers }),
                fetch(`${API_URL}/expenses`, { headers }),
                fetch(`${API_URL}/friends`, { headers }),
                fetch(`${API_URL}/friends/requests`, { headers }),
            ]);
            const [uR, bR, eR, fR, rR] = responses;
            if (uR.status === 401) throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');

            const [userData, balanceData, expensesData, friendsData, requestsData] = await Promise.all(responses.map((r) => r.json()));
            const failed = [!uR.ok && 'perfil', !bR.ok && 'balance', !eR.ok && 'gastos', !fR.ok && 'amigos', !rR.ok && 'solicitudes'].filter(Boolean);
            if (failed.length > 0) throw new Error(`No se pudo cargar: ${failed.join(', ')}`);

            const pickList = (data, ...keys) => {
                for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
                return Array.isArray(data) ? data : [];
            };

            setCurrentUser(userData.user);
            setBalance({
                owed_to_me: numberOrZero(balanceData?.owed_to_me),
                i_owe: numberOrZero(balanceData?.i_owe),
                net_balance: numberOrZero(balanceData?.net_balance),
                by_friend: Array.isArray(balanceData?.by_friend)
                    ? balanceData.by_friend.map((f) => ({ ...f, owed_to_me: numberOrZero(f?.owed_to_me), i_owe: numberOrZero(f?.i_owe), net: numberOrZero(f?.net) }))
                    : [],
            });
            setExpenses(Array.isArray(expensesData.expenses) ? expensesData.expenses : []);
            setFriends(pickList(friendsData, 'friends'));
            setPendingFriendRequests(pickList(requestsData, 'requests', 'friends'));
        } catch (err) {
            showToast(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    const refresh = useCallback(() => loadData(localStorage.getItem(TOKEN_KEY)), [loadData]);

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

    const performExpenseAction = useCallback(async (path, method = 'PATCH', body = null) => {
        const token = localStorage.getItem(TOKEN_KEY);
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}${path}`, {
                method,
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
                ...(body ? { body: JSON.stringify(body) } : {}),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || `Error ${response.status}`);
            await loadData(token);
            setDataVersion((v) => v + 1);
            return data;
        } catch (err) {
            showToast(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [loadData, showToast]);

    const swallow = (promise) => promise.catch(() => {});
    const handleClaim = (id, amount) => swallow(performExpenseAction(`/expenses/${id}/claim`, 'PATCH', amount ? { amount } : null));
    const handleMarkPaid = (id, userId, amount) => swallow(performExpenseAction(`/expenses/${id}/participants/${userId}/mark-paid`, 'PATCH', amount ? { amount } : null));
    const handleConfirm = (id, userId) => swallow(performExpenseAction(`/expenses/${id}/participants/${userId}/confirm`));
    const handleReject = (id, userId) => swallow(performExpenseAction(`/expenses/${id}/participants/${userId}/reject`));
    const handleDelete = async (expense) => {
        try {
            await performExpenseAction(`/expenses/${expense.id}`, 'DELETE');
            setSelectedExpenseId(null);
        } catch { /* el aviso ya se mostró */ }
    };

    const handleLogout = () => {
        localStorage.removeItem(TOKEN_KEY);
        setIsLoggedIn(false);
        setCurrentUser(null);
        setBalance(EMPTY_BALANCE);
        setExpenses([]);
        setFriends([]);
        setPendingFriendRequests([]);
        setSelectedExpenseId(null);
        setActiveTabState('home');
        window.history.replaceState(null, '', '#home');
    };

    // ---- Agregar: cada pantalla sabe qué agregar; Inicio pregunta ---------
    const handleAdd = () => {
        if (activeTab === 'expenses') { setEditingExpense(null); setShowCreateExpense(true); }
        else if (activeTab === 'personal') { setBudgetSection(null); setShowAddBudgetItem(true); }
        else if (activeTab === 'accounts') setShowAddLedger(true);
        else if (activeTab === 'friends') setShowAddFriend(true);
        else setShowAddMenu(true);
    };

    const handleAddMenuPick = (id) => {
        setShowAddMenu(false);
        if (id === 'expense') { setEditingExpense(null); setShowCreateExpense(true); }
        else if (id === 'personal') { setBudgetSection(null); setShowAddBudgetItem(true); }
        else { setAccountsSegment(id); setShowAddLedger(true); }
    };

    const afterCreate = (tab) => {
        setDataVersion((v) => v + 1);
        refresh();
        setActiveTab(tab);
    };

    const friendUsers = useMemo(() => friends.map((f) => {
        const u = f?.user || f?.friend || f?.profile || f;
        return {
            id: numberOrZero(u?.id ?? f?.user_id ?? f?.friend_id),
            username: String(u?.username || '').trim(),
            email: String(u?.email || '').trim(),
            displayName: displayNameOf(u),
        };
    }).filter((u) => u.id > 0), [friends]);

    const selectedExpense = useMemo(() => expenses.find((e) => e.id === selectedExpenseId) || null, [expenses, selectedExpenseId]);
    const openExpense = useCallback((expense) => setSelectedExpenseId(expense.id), []);
    const closeExpense = useCallback(() => setSelectedExpenseId(null), []);

    const userName = displayNameOf(currentUser);
    const addLabel = activeTab === 'expenses' ? 'Nuevo gasto' : activeTab === 'personal' ? 'Agregar movimiento' : activeTab === 'accounts' ? (accountsSegment === 'owed' ? 'Alguien me debe' : 'Yo debo') : activeTab === 'friends' ? 'Agregar amigo' : 'Agregar';
    const badges = { friends: pendingFriendRequests.length };

    if (isBooting) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 animate-fade-in">
                <Logo size={68} />
                <span className="small">Split.it</span>
            </div>
        );
    }

    if (!isLoggedIn) {
        return <LoginView onAuth={() => setIsLoggedIn(true)} loadData={loadData} />;
    }

    return (
        <div className="min-h-screen">
            <Sidebar activeTab={activeTab} onChange={setActiveTab} badges={badges} userName={userName} userEmail={currentUser?.email} onOpenAccount={() => setShowAccount(true)} onAdd={handleAdd} addLabel={addLabel} />

            {toast && (
                <div className="fixed inset-x-0 z-[110] flex justify-center px-4 animate-pop-in" style={{ top: 'calc(var(--safe-top) + 12px)' }} role="alert">
                    <div className="card flex max-w-md items-center gap-3 py-3 pl-5 pr-2">
                        <p className="small flex-1" style={{ color: 'var(--ink)' }}>{toast}</p>
                        <button type="button" onClick={() => setToast('')} aria-label="Cerrar aviso" className="btn btn-icon" style={{ width: 34, height: 34, boxShadow: 'none', background: 'var(--card-soft)' }}><X size={15} weight="bold" /></button>
                    </div>
                </div>
            )}

            <main className="xl:pl-[17rem] pb-[calc(120px+var(--safe-bottom))] xl:pb-16">
                <div className="mx-auto max-w-3xl px-4 sm:px-6">
                {activeTab === 'home' && (
                    <HomeView
                        key={dataVersion}
                        currentUser={currentUser}
                        expenses={expenses}
                        pendingFriendRequests={pendingFriendRequests}
                        balance={balance}
                        onNavigate={setActiveTab}
                        onOpenExpense={openExpense}
                        onAdd={handleAdd}
                        onOpenAccount={() => setShowAccount(true)}
                    />
                )}
                {activeTab === 'expenses' && (
                    <ExpensesView
                        expenses={expenses}
                        balance={balance}
                        currentUserId={currentUserId}
                        filter={expenseFilter}
                        onFilterChange={setExpenseFilter}
                        onOpen={openExpense}
                        onAdd={handleAdd}
                        onOpenFriends={() => setActiveTab('friends')}
                        friendBadge={pendingFriendRequests.length}
                    />
                )}
                {activeTab === 'personal' && (
                    <BudgetView
                        refreshKey={dataVersion}
                        onAddToSection={(section) => { setBudgetSection(section); setShowAddBudgetItem(true); }}
                        onViewSyncedExpense={(id) => setSelectedExpenseId(id)}
                        onViewAccounts={() => setActiveTab('accounts')}
                    />
                )}
                {activeTab === 'accounts' && (
                    <AccountsView segment={accountsSegment} onSegmentChange={setAccountsSegment} refreshKey={dataVersion} onAdd={handleAdd} />
                )}
                {activeTab === 'friends' && (
                    <FriendsView
                        friends={friends}
                        pendingRequests={pendingFriendRequests}
                        balance={balance}
                        token={localStorage.getItem(TOKEN_KEY)}
                        onRefresh={refresh}
                        isAddOpen={showAddFriend}
                        onAddOpenChange={setShowAddFriend}
                    />
                )}
                </div>
            </main>

            <TabBar activeTab={activeTab} onChange={setActiveTab} onAdd={handleAdd} addLabel={addLabel} />

            <AddMenuSheet isOpen={showAddMenu} onClose={() => setShowAddMenu(false)} onPick={handleAddMenuPick} />

            <CreateExpenseSheet
                isOpen={showCreateExpense}
                onClose={() => { setShowCreateExpense(false); setEditingExpense(null); }}
                onSuccess={() => afterCreate('expenses')}
                friendUsers={friendUsers}
                currentUserId={currentUserId}
                initialExpense={editingExpense}
                onGoToFriends={() => setActiveTab('friends')}
            />

            <AddBudgetItemModal
                isOpen={showAddBudgetItem}
                initialSection={budgetSection}
                onClose={() => setShowAddBudgetItem(false)}
                onCreated={() => { setShowAddBudgetItem(false); afterCreate('personal'); }}
            />

            <AddLedgerEntrySheet
                isOpen={showAddLedger}
                kind={accountsSegment}
                onClose={() => setShowAddLedger(false)}
                onCreated={() => { setShowAddLedger(false); afterCreate('accounts'); }}
            />

            <ExpenseDetailSheet
                expense={selectedExpense}
                currentUserId={currentUserId}
                onClose={closeExpense}
                onClaim={handleClaim}
                onMarkPaid={handleMarkPaid}
                onConfirmPayment={handleConfirm}
                onRejectPayment={handleReject}
                onEdit={(expense) => { setSelectedExpenseId(null); setEditingExpense(expense); setShowCreateExpense(true); }}
                onDelete={handleDelete}
                isLoading={isLoading}
            />

            <AccountSheet
                isOpen={showAccount}
                onClose={() => setShowAccount(false)}
                user={currentUser}
                themePref={themePref}
                onThemeChange={setThemePref}
                onLogout={handleLogout}
            />
        </div>
    );
};

export default App;
