import { useState } from 'react';
import {
    CalendarDays,
    ChevronRight,
    Eye,
    EyeOff,
    Loader2,
    Lock,
    Mail,
    MoonStar,
    Phone,
    SunMedium,
    UserRound,
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { API_URL } from '../config/api';

const TOKEN_KEY = 'splitit_jwt';

export const LoginView = ({ onAuth, loadData, theme = 'dark', onToggleTheme }) => {
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Register-only fields
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [secondLastName, setSecondLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [birthDate, setBirthDate] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ identifier: email.trim(), password }),
            });
            const d = await res.json();
            if (res.ok) {
                localStorage.setItem(TOKEN_KEY, d.token);
                await loadData(d.token);
                onAuth();
            } else {
                setError(d.message || 'Credenciales inválidas');
            }
        } catch {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const norm = (v) => v.trim();
        if (!norm(email) || !norm(password) || !norm(username) || !norm(firstName) || !norm(lastName) || !norm(phone)) {
            setError('Por favor completa todos los campos obligatorios');
            setLoading(false);
            return;
        }

        try {
            const payload = {
                email: norm(email),
                password: norm(password),
                username: norm(username),
                first_name: norm(firstName),
                last_name: norm(lastName),
                phone: norm(phone),
                ...(middleName && { middle_name: norm(middleName) }),
                ...(secondLastName && { second_last_name: norm(secondLastName) }),
                ...(birthDate && { birth_date: birthDate }),
            };

            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(payload),
            });
            const d = await res.json();

            if (res.ok) {
                // Auto-login after register
                const loginRes = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const loginData = await loginRes.json();
                if (loginRes.ok) {
                    localStorage.setItem(TOKEN_KEY, loginData.token);
                    await loadData(loginData.token);
                    onAuth();
                }
            } else {
                setError(d.message || 'Error al registrarse');
            }
        } catch {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const switchMode = () => {
        setMode((m) => (m === 'login' ? 'register' : 'login'));
        setError('');
        setEmail(''); setPassword(''); setUsername(''); setFirstName('');
        setMiddleName(''); setLastName(''); setSecondLastName(''); setPhone(''); setBirthDate('');
    };

    return (
        <div
            className="min-h-screen relative overflow-hidden px-4 py-8 flex items-center justify-center"
            style={{ background: 'var(--app-bg)' }}
        >
            {/* Background orbs */}
            <div className="absolute inset-0 pointer-events-none">
                <div
                    className="absolute top-[-8%] left-1/2 -translate-x-1/2 w-[60vw] h-[60vw] rounded-full blur-[130px]"
                    style={{ background: 'rgba(232, 24, 156, 0.22)' }}
                />
                <div
                    className="absolute bottom-[-8%] right-[-10%] w-[40vw] h-[40vw] rounded-full blur-[130px]"
                    style={{ background: 'rgba(14, 165, 233, 0.10)' }}
                />
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="glass-border rounded-4xl p-px">
                    <GlassCard theme={theme} className="relative overflow-hidden px-6 py-7 sm:px-8 sm:py-8">
                        <div className="absolute inset-0 bg-linear-to-br from-white/10 via-transparent to-transparent pointer-events-none" />

                        {/* Header */}
                        <div className="relative z-10 flex items-start justify-between gap-4 mb-7">
                            <div className="flex items-center gap-4">
                                <div
                                    className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-2xl shrink-0"
                                    style={{
                                        background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                                        boxShadow: '0 18px 35px -18px rgba(232, 24, 156, 0.6)',
                                    }}
                                >
                                    <UserRound size={24} style={{ color: 'var(--accent-contrast)' }} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-secondary">
                                        Split.it
                                    </p>
                                    <h2 className="text-3xl font-extrabold tracking-tight text-primary mt-2">
                                        {mode === 'login' ? 'Bienvenido' : 'Crear cuenta'}
                                    </h2>
                                    <p className="text-sm text-secondary mt-1">
                                        {mode === 'login'
                                            ? 'Accede a tu cuenta para continuar.'
                                            : 'Completa el formulario para unirte.'}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={onToggleTheme}
                                className="h-11 w-11 rounded-full flex items-center justify-center border transition-all shrink-0"
                                style={{
                                    background: 'var(--surface-soft)',
                                    borderColor: 'var(--surface-border)',
                                    color: 'var(--text-primary)',
                                }}
                                aria-label="Cambiar tema"
                            >
                                {theme === 'dark' ? <SunMedium size={18} /> : <MoonStar size={18} />}
                            </button>
                        </div>

                        <form
                            onSubmit={mode === 'login' ? handleLogin : handleRegister}
                            className="relative z-10 space-y-4"
                        >
                            {error && (
                                <div
                                    className="rounded-2xl border px-4 py-3 text-sm text-primary"
                                    style={{
                                        background: 'rgba(244, 63, 94, 0.10)',
                                        borderColor: 'rgba(244, 63, 94, 0.18)',
                                    }}
                                >
                                    {error}
                                </div>
                            )}

                            <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-[0.28em] text-secondary">
                                    {mode === 'login' ? 'Email, usuario o teléfono' : 'Email'}
                                </label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-secondary" />
                                    <input
                                        className="input-underline"
                                        placeholder={mode === 'login' ? 'you@example.com, usuario o +56...' : 'you@example.com'}
                                        type={mode === 'login' ? 'text' : 'email'}
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[10px] font-bold uppercase tracking-[0.28em] text-secondary">
                                    Contraseña
                                </label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-secondary" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="input-underline pr-11"
                                        placeholder="••••••••"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
                                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {mode === 'register' && (
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div className="col-span-2 relative">
                                        <UserRound
                                            size={16}
                                            className="absolute left-0 top-1/2 -translate-y-1/2 text-secondary"
                                        />
                                        <input
                                            className="input-underline"
                                            placeholder="Nombre de usuario *"
                                            type="text"
                                            required
                                            maxLength="30"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                        />
                                    </div>
                                    <div className="relative">
                                        <input
                                            className="input-underline pl-0"
                                            placeholder="Nombre *"
                                            type="text"
                                            required
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                        />
                                    </div>
                                    <div className="relative">
                                        <input
                                            className="input-underline pl-0"
                                            placeholder="Apellido *"
                                            type="text"
                                            required
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                        />
                                    </div>
                                    <div className="relative">
                                        <input
                                            className="input-underline pl-0"
                                            placeholder="Segundo nombre"
                                            type="text"
                                            value={middleName}
                                            onChange={(e) => setMiddleName(e.target.value)}
                                        />
                                    </div>
                                    <div className="relative">
                                        <input
                                            className="input-underline pl-0"
                                            placeholder="Segundo apellido"
                                            type="text"
                                            value={secondLastName}
                                            onChange={(e) => setSecondLastName(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-2 relative">
                                        <Phone
                                            size={16}
                                            className="absolute left-0 top-1/2 -translate-y-1/2 text-secondary"
                                        />
                                        <input
                                            className="input-underline"
                                            placeholder="Teléfono *"
                                            type="tel"
                                            required
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-2 relative">
                                        <CalendarDays
                                            size={16}
                                            className="absolute left-0 top-1/2 -translate-y-1/2 text-secondary"
                                        />
                                        <input
                                            className="input-underline"
                                            placeholder="Fecha de nacimiento"
                                            type="date"
                                            value={birthDate}
                                            onChange={(e) => setBirthDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                disabled={loading}
                                className="w-full rounded-[1.35rem] px-5 py-4 text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-50 mt-2"
                                style={{
                                    background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                                    boxShadow: '0 14px 30px -16px rgba(232, 24, 156, 0.75)',
                                    color: 'var(--accent-contrast)',
                                }}
                            >
                                {loading ? (
                                    <Loader2 size={18} className="animate-spin mx-auto" />
                                ) : mode === 'login' ? (
                                    'Acceder'
                                ) : (
                                    'Crear cuenta'
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={switchMode}
                                className="w-full rounded-[1.25rem] px-4 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 text-secondary hover:text-primary"
                            >
                                {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
                                <ChevronRight size={16} />
                            </button>
                        </form>
                    </GlassCard>
                </div>

                <p
                    className="text-center text-[10px] mt-6 font-bold uppercase tracking-[0.32em] text-secondary"
                >
                    Vibrance & Depth UI
                </p>
            </div>
        </div>
    );
};
