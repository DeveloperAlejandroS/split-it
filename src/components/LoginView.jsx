import { useState } from 'react';
import { Coins, Eye, EyeOff, Loader2 } from 'lucide-react';
import { API_URL } from '../config/api';

const TOKEN_KEY = 'splitit_jwt';
const MIN_PASSWORD = 8;

const post = async (path, body) => {
    const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
    });
    return { ok: res.ok, data: await res.json() };
};

// Pantalla de entrada. Registrarse pide solo lo necesario (nombre, correo,
// contraseña): usuario y teléfono son opcionales -- antes eran obligatorios
// y eran la razón número uno para abandonar el registro. El nombre sí se
// pide porque es lo que tus amigos ven en lugar de un correo.
export const LoginView = ({ onAuth, loadData }) => {
    const [mode, setMode] = useState('login');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isRegister = mode === 'register';

    const finish = async (token) => {
        localStorage.setItem(TOKEN_KEY, token);
        await loadData(token);
        onAuth();
    };

    const submit = async (e) => {
        e.preventDefault();
        setError('');

        if (isRegister) {
            if (!firstName.trim() || !lastName.trim()) return setError('Escribe tu nombre y apellido.');
            if (!identifier.includes('@')) return setError('Escribe un correo válido.');
            if (password.length < MIN_PASSWORD) return setError(`La contraseña necesita al menos ${MIN_PASSWORD} caracteres.`);
        } else if (!identifier.trim() || !password) {
            return setError('Escribe tu usuario y tu contraseña.');
        }

        setLoading(true);
        try {
            if (isRegister) {
                const created = await post('/auth/register', {
                    email: identifier.trim(),
                    password,
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    ...(username.trim() && { username: username.trim() }),
                    ...(phone.trim() && { phone: phone.trim() }),
                });
                if (!created.ok) throw new Error(created.data.message || 'No se pudo crear la cuenta.');
            }
            const session = await post('/auth/login', { identifier: identifier.trim(), password });
            if (!session.ok) throw new Error(session.data.message || 'Usuario o contraseña incorrectos.');
            await finish(session.data.token);
        } catch (err) {
            setError(err instanceof TypeError ? 'No hay conexión con el servidor. Revisa tu internet.' : err.message);
        } finally {
            setLoading(false);
        }
    };

    const switchMode = (next) => {
        setMode(next);
        setError('');
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10" style={{ paddingTop: 'max(2.5rem, var(--safe-top))' }}>
            <div className="w-full max-w-sm animate-fade-up">
                <div className="mb-8 flex flex-col items-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[18px]" style={{ background: 'linear-gradient(135deg, var(--brand), var(--accent-2))' }}>
                        <Coins size={30} color="#fff" />
                    </div>
                    <h1 className="t-large-title">Split.it</h1>
                    <p className="t-subhead mt-1 text-secondary">Gastos compartidos y tu presupuesto, en un solo lugar.</p>
                </div>

                <div className="segmented mb-5" role="group" aria-label="Modo">
                    <button type="button" aria-pressed={!isRegister} onClick={() => switchMode('login')}>Iniciar sesión</button>
                    <button type="button" aria-pressed={isRegister} onClick={() => switchMode('register')}>Crear cuenta</button>
                </div>

                <form onSubmit={submit} className="space-y-3" noValidate>
                    {isRegister && (
                        <div className="grid grid-cols-2 gap-3">
                            <input className="field" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nombre" aria-label="Nombre" autoComplete="given-name" autoCapitalize="words" enterKeyHint="next" />
                            <input className="field" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Apellido" aria-label="Apellido" autoComplete="family-name" autoCapitalize="words" enterKeyHint="next" />
                        </div>
                    )}

                    <input
                        className="field"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder={isRegister ? 'Correo electrónico' : 'Correo, usuario o teléfono'}
                        aria-label={isRegister ? 'Correo electrónico' : 'Correo, usuario o teléfono'}
                        type={isRegister ? 'email' : 'text'}
                        inputMode={isRegister ? 'email' : 'text'}
                        autoComplete={isRegister ? 'email' : 'username'}
                        autoCapitalize="none"
                        autoCorrect="off"
                        enterKeyHint="next"
                    />

                    <div className="relative">
                        <input
                            className="field"
                            style={{ paddingRight: 52 }}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Contraseña"
                            aria-label="Contraseña"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete={isRegister ? 'new-password' : 'current-password'}
                            enterKeyHint={isRegister ? 'next' : 'go'}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    {isRegister && <p className="t-footnote px-1 text-secondary">Mínimo {MIN_PASSWORD} caracteres.</p>}

                    {isRegister && (
                        <>
                            <p className="t-section px-1 pt-3">Opcional</p>
                            <input className="field" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nombre de usuario" aria-label="Nombre de usuario" autoComplete="username" autoCapitalize="none" autoCorrect="off" enterKeyHint="next" />
                            <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" aria-label="Teléfono" type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="go" />
                            <p className="t-footnote px-1 text-secondary">Tus amigos pueden encontrarte por usuario, correo o teléfono.</p>
                        </>
                    )}

                    {error && (
                        <p role="alert" className="t-subhead rounded-[12px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>
                    )}

                    <button type="submit" className="btn btn-primary btn-block !mt-5" disabled={loading}>
                        {loading ? <Loader2 size={20} className="animate-spin" /> : isRegister ? 'Crear cuenta' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
};
