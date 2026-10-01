import { useState } from 'react';
import { CircleNotch, Eye, EyeSlash } from '@phosphor-icons/react';
import { API_URL } from '../config/api';
import { Logo } from './ui/Logo';

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

// Entrada: cabecera violeta con la marca (como el splash de las referencias)
// y el formulario en una tarjeta que sube sobre ella. Registrarse pide solo
// lo necesario (nombre, correo, contraseña): usuario y teléfono son
// opcionales. El nombre sí se pide porque es lo que tus amigos ven en lugar
// de un correo.
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
            localStorage.setItem(TOKEN_KEY, session.data.token);
            await loadData(session.data.token);
            onAuth();
        } catch (err) {
            setError(err instanceof TypeError ? 'No hay conexión con el servidor. Revisa tu internet.' : err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen">
            <div
                className="relative overflow-hidden px-6 pb-24 text-center text-white"
                style={{
                    paddingTop: 'calc(var(--safe-top) + 56px)',
                    background: 'radial-gradient(90% 70% at 85% 0%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 60%), var(--grad-hero)',
                    borderRadius: '0 0 44px 44px',
                }}
            >
                <span aria-hidden="true" className="absolute -left-10 top-16 h-40 w-40 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <span aria-hidden="true" className="absolute -right-12 bottom-6 h-32 w-32 rounded-full" style={{ background: 'rgba(255,122,61,0.28)' }} />
                <div className="relative animate-fade-up">
                    <div className="mx-auto mb-5 w-fit rounded-[24px] bg-white/15 p-2"><Logo size={56} /></div>
                    <h1 className="display-1" style={{ color: '#fff' }}>Split.it</h1>
                    <p className="small mx-auto mt-2 max-w-[18rem]" style={{ color: 'rgba(255,255,255,0.85)' }}>Divide gastos con tus amigos y ten tu presupuesto en el mismo lugar.</p>
                </div>
            </div>

            <div className="mx-auto -mt-14 w-full max-w-md px-4 pb-10">
                <form onSubmit={submit} noValidate className="card animate-fade-up space-y-3 p-5" style={{ animationDelay: '80ms' }}>
                    <div className="segmented mb-2" role="group" aria-label="Modo" style={{ background: 'var(--card-soft)', boxShadow: 'none' }}>
                        <button type="button" aria-pressed={!isRegister} onClick={() => { setMode('login'); setError(''); }}>Iniciar sesión</button>
                        <button type="button" aria-pressed={isRegister} onClick={() => { setMode('register'); setError(''); }}>Crear cuenta</button>
                    </div>

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
                            style={{ paddingRight: 56 }}
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
                            style={{ color: 'var(--ink-3)' }}
                        >
                            {showPassword ? <EyeSlash size={22} /> : <Eye size={22} />}
                        </button>
                    </div>
                    {isRegister && <p className="tiny px-1">Mínimo {MIN_PASSWORD} caracteres.</p>}

                    {isRegister && (
                        <>
                            <p className="heading px-1 pt-2">Opcional</p>
                            <input className="field" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nombre de usuario" aria-label="Nombre de usuario" autoComplete="username" autoCapitalize="none" autoCorrect="off" enterKeyHint="next" />
                            <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" aria-label="Teléfono" type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="go" />
                            <p className="tiny px-1">Tus amigos pueden encontrarte por usuario, correo o teléfono.</p>
                        </>
                    )}

                    {error && <p role="alert" className="small rounded-[16px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}

                    <button type="submit" className="btn btn-primary btn-block !mt-5" disabled={loading}>
                        {loading ? <CircleNotch size={22} className="animate-spin" /> : isRegister ? 'Crear cuenta' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
};
