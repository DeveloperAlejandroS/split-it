import { useEffect, useRef, useState } from 'react';
import { Bell, Camera, CaretRight, Check, CircleNotch, DeviceMobile, Eye, EyeSlash, Lock, Palette, SignOut, Trash, UserCircle } from '@phosphor-icons/react';
import { Sheet } from './ui/Sheet';
import { Avatar } from './ui/Avatar';
import { ConfirmDialog } from './ConfirmDialog';
import { API_URL } from '../config/api';
import { ACCENT_PRESETS, DEFAULT_ACCENT, isValidHex } from '../utils/accent';
import { fileToAvatar } from '../utils/image';
import { displayNameOf } from '../utils/helpers';
import { disablePush, enablePush, getPushState, sendTestPush } from '../utils/push';
import { useInstall } from '../utils/useInstall';
import { IosInstallSheet } from './InstallBanner';

const TOKEN_KEY = 'splitit_jwt';
const MIN_PASSWORD = 8;

const THEME_OPTIONS = [
    { id: 'system', label: 'Automático' },
    { id: 'light', label: 'Claro' },
    { id: 'dark', label: 'Oscuro' },
];

const PAGE_TITLES = { root: 'Ajustes', profile: 'Perfil', security: 'Contraseña', appearance: 'Apariencia', notifications: 'Notificaciones' };

const request = async (method, path, body) => {
    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
    return data;
};

const friendlyError = (err) => (err instanceof TypeError ? 'No hay conexión con el servidor. Revisa tu internet.' : err.message);

const Field = ({ label, children }) => (
    <label className="block">
        <span className="field-label">{label}</span>
        {children}
    </label>
);

// ---- Páginas ------------------------------------------------------------

const InstallRow = () => {
    const { mode, install } = useInstall();
    const [showIos, setShowIos] = useState(false);
    if (!mode) return null;
    return (
        <>
            <div className="stack mt-3">
                <button type="button" className="row" onClick={() => (mode === 'prompt' ? install() : setShowIos(true))}>
                    <span className="bubble h-11 w-11 rounded-full" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}><DeviceMobile size={22} weight="duotone" /></span>
                    <span className="min-w-0 flex-1 text-left">
                        <span className="body block font-semibold">Instalar app</span>
                        <span className="small block truncate">{mode === 'prompt' ? 'Ábrela a pantalla completa' : 'Cómo agregarla al inicio del iPhone'}</span>
                    </span>
                    <CaretRight size={16} weight="bold" style={{ color: 'var(--ink-3)' }} />
                </button>
            </div>
            <IosInstallSheet isOpen={showIos} onClose={() => setShowIos(false)} />
        </>
    );
};

const PUSH_COPY = {
    unsupported: 'Este navegador no admite notificaciones. En iPhone, primero instala la app en la pantalla de inicio y ábrela desde ahí.',
    denied: 'Bloqueaste las notificaciones para Split.it. Actívalas en los ajustes del navegador o del teléfono y vuelve aquí.',
    on: 'Te avisamos cuando llegue una solicitud de amistad, un gasto nuevo o un pago por confirmar.',
    off: 'Recibe un aviso cuando llegue una solicitud de amistad, un gasto nuevo o un pago por confirmar.',
};

const NotificationsPage = ({ onToast }) => {
    const [state, setState] = useState('loading');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { getPushState().then(setState); }, []);

    const toggle = async () => {
        setBusy(true);
        setError('');
        try {
            if (state === 'on') await disablePush(); else await enablePush();
        } catch (err) {
            setError(err.message);
        } finally {
            setState(await getPushState());
            setBusy(false);
        }
    };

    const test = async () => {
        try {
            await sendTestPush();
            onToast?.('Prueba enviada. Debería llegar en unos segundos.');
        } catch (err) {
            setError(err.message);
        }
    };

    if (state === 'loading') return <div className="flex justify-center py-10"><CircleNotch size={22} className="animate-spin" style={{ color: 'var(--ink-3)' }} /></div>;

    const canToggle = state === 'on' || state === 'off';
    return (
        <div className="space-y-4">
            <div className="card flex items-center gap-3 p-4">
                <span className="bubble h-11 w-11 shrink-0 rounded-full" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}><Bell size={22} weight={state === 'on' ? 'fill' : 'duotone'} /></span>
                <span className="min-w-0 flex-1">
                    <span className="body block font-semibold">{state === 'on' ? 'Activadas en este dispositivo' : 'Desactivadas'}</span>
                    <span className="small block">{PUSH_COPY[state]}</span>
                </span>
            </div>
            {canToggle && (
                <button type="button" className={`btn btn-block ${state === 'on' ? 'btn-gray' : 'btn-primary'}`} disabled={busy} onClick={toggle}>
                    {busy ? <CircleNotch size={20} className="animate-spin" /> : state === 'on' ? 'Desactivar notificaciones' : 'Activar notificaciones'}
                </button>
            )}
            {state === 'on' && <button type="button" className="btn btn-tinted btn-block" onClick={test}>Enviar una de prueba</button>}
            {error && <p role="alert" className="small rounded-[16px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}
            <p className="tiny px-1">Se activan por dispositivo: hazlo en cada teléfono o computador donde quieras recibirlas.</p>
        </div>
    );
};

const RootPage = ({ user, name, onGo, onLogout }) => (
    <>
        <button type="button" onClick={() => onGo('profile')} className="hero flex w-full items-center gap-4 p-5 text-left transition-transform active:scale-[0.98]" style={{ transitionDuration: '160ms' }}>
            <Avatar name={name} src={user?.avatar_url} size={64} />
            <span className="min-w-0 flex-1">
                <span className="title block truncate">{name}</span>
                <span className="small block truncate">{user?.email}</span>
            </span>
            <CaretRight size={18} weight="bold" style={{ opacity: 0.8 }} />
        </button>

        <div className="stack mt-6">
            {[
                { id: 'profile', label: 'Perfil', hint: 'Foto, nombre y usuario', icon: UserCircle },
                { id: 'security', label: 'Contraseña', hint: 'Cámbiala cuando quieras', icon: Lock },
                { id: 'appearance', label: 'Apariencia', hint: 'Tema y color de la app', icon: Palette },
                { id: 'notifications', label: 'Notificaciones', hint: 'Solicitudes, gastos y pagos', icon: Bell },
            ].map(({ id, label, hint, icon: Icon }) => (
                <button key={id} type="button" className="row" onClick={() => onGo(id)}>
                    <span className="bubble h-11 w-11 rounded-full" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}><Icon size={22} weight="duotone" /></span>
                    <span className="min-w-0 flex-1 text-left">
                        <span className="body block font-semibold">{label}</span>
                        <span className="small block truncate">{hint}</span>
                    </span>
                    <CaretRight size={16} weight="bold" style={{ color: 'var(--ink-3)' }} />
                </button>
            ))}
        </div>

        <InstallRow />

        <button type="button" className="btn btn-danger btn-block mt-8" onClick={onLogout}>
            <SignOut size={20} weight="bold" />
            Cerrar sesión
        </button>
    </>
);

const ProfilePage = ({ user, name, form, setForm, onPickPhoto, onRemovePhoto, photoBusy, error }) => {
    const fileRef = useRef(null);
    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
    return (
        <div className="space-y-5">
            <div className="flex flex-col items-center gap-3 pt-1">
                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    aria-label="Cambiar foto de perfil"
                    className="relative rounded-full transition-transform active:scale-95"
                    style={{ transitionDuration: '160ms' }}
                    disabled={photoBusy}
                >
                    <Avatar name={name} src={form.avatar_url} size={104} />
                    <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ background: 'var(--grad-hero)', boxShadow: '0 0 0 3px var(--bg)' }}>
                        <Camera size={18} weight="fill" />
                    </span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickPhoto} />
                {form.avatar_url && (
                    <button type="button" className="btn btn-plain btn-sm" style={{ color: 'var(--danger)' }} onClick={onRemovePhoto}>
                        <Trash size={16} weight="bold" /> Quitar foto
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre"><input className="field" value={form.first_name} onChange={set('first_name')} autoComplete="given-name" autoCapitalize="words" /></Field>
                <Field label="Apellido"><input className="field" value={form.last_name} onChange={set('last_name')} autoComplete="family-name" autoCapitalize="words" /></Field>
            </div>
            <Field label="Usuario"><input className="field" value={form.username} onChange={set('username')} autoComplete="username" autoCapitalize="none" autoCorrect="off" placeholder="Opcional" /></Field>
            <Field label="Teléfono"><input className="field" value={form.phone} onChange={set('phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="Opcional" /></Field>
            <Field label="Correo"><input className="field" value={user?.email || ''} readOnly disabled style={{ opacity: 0.6 }} /></Field>
            <p className="tiny px-1">Tus amigos te ven con tu nombre y tu foto. El correo no se puede cambiar por ahora.</p>

            {error && <p role="alert" className="small rounded-[16px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}
        </div>
    );
};

const SecurityPage = ({ form, setForm, error }) => {
    const [show, setShow] = useState(false);
    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
    const type = show ? 'text' : 'password';
    return (
        <div className="space-y-4">
            <p className="small px-1">Escribe tu contraseña actual y la nueva. Mínimo {MIN_PASSWORD} caracteres.</p>
            <Field label="Contraseña actual"><input className="field" type={type} value={form.current} onChange={set('current')} autoComplete="current-password" /></Field>
            <Field label="Contraseña nueva"><input className="field" type={type} value={form.next} onChange={set('next')} autoComplete="new-password" /></Field>
            <Field label="Repite la nueva"><input className="field" type={type} value={form.repeat} onChange={set('repeat')} autoComplete="new-password" /></Field>
            <button type="button" className="btn btn-plain btn-sm" onClick={() => setShow((v) => !v)}>
                {show ? <EyeSlash size={18} /> : <Eye size={18} />} {show ? 'Ocultar' : 'Mostrar'} contraseñas
            </button>
            {error && <p role="alert" className="small rounded-[16px] p-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}
        </div>
    );
};

const AppearancePage = ({ themePref, onThemeChange, accent, onAccentChange }) => {
    const isPreset = ACCENT_PRESETS.some((p) => p.hex.toLowerCase() === accent.toLowerCase());
    return (
        <div className="space-y-6">
            <section>
                <p className="heading px-1 pb-3">Tema</p>
                <div className="segmented" role="group" aria-label="Tema">
                    {THEME_OPTIONS.map((opt) => (
                        <button key={opt.id} type="button" aria-pressed={themePref === opt.id} onClick={() => onThemeChange(opt.id)}>{opt.label}</button>
                    ))}
                </div>
                <p className="tiny px-1 pt-2">Automático sigue el modo claro u oscuro de tu dispositivo.</p>
            </section>

            <section>
                <p className="heading px-1 pb-3">Color de la app</p>
                <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Color de la app">
                    {ACCENT_PRESETS.map((p) => {
                        const active = accent.toLowerCase() === p.hex.toLowerCase();
                        return (
                            <button
                                key={p.id}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                aria-label={p.label}
                                title={p.label}
                                onClick={() => onAccentChange(p.hex)}
                                className="swatch"
                                data-active={active}
                                style={{ background: p.hex }}
                            >
                                {active && <Check size={20} weight="bold" color="#fff" />}
                            </button>
                        );
                    })}
                    <label className="swatch swatch-custom" data-active={!isPreset} title="Color personalizado" style={!isPreset ? { background: accent } : undefined}>
                        {!isPreset ? <Check size={20} weight="bold" color="#fff" /> : <Palette size={20} weight="bold" />}
                        <input
                            type="color"
                            value={isValidHex(accent) ? accent : DEFAULT_ACCENT}
                            onChange={(e) => onAccentChange(e.target.value)}
                            aria-label="Elegir un color personalizado"
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                    </label>
                </div>
                <p className="tiny px-1 pt-3">El verde de «te deben» y el naranja de «debes» no cambian: siempre significan lo mismo. El color se guarda en este dispositivo.</p>
            </section>
        </div>
    );
};

// ---- Hoja -----------------------------------------------------------------

export const SettingsSheet = ({ isOpen, onClose, user, onUserUpdated, themePref, onThemeChange, accent, onAccentChange, onLogout, onToast }) => {
    const [page, setPage] = useState('root');
    const [dir, setDir] = useState('forward');
    const [confirmLogout, setConfirmLogout] = useState(false);
    const [saving, setSaving] = useState(false);
    const [photoBusy, setPhotoBusy] = useState(false);
    const [error, setError] = useState('');
    const [profile, setProfile] = useState({ first_name: '', last_name: '', username: '', phone: '', avatar_url: null });
    const [password, setPassword] = useState({ current: '', next: '', repeat: '' });

    const name = displayNameOf(user) || 'Tu cuenta';

    // Al abrir: página raíz y formularios con los datos actuales.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen) return;
        setPage('root');
        setError('');
        setPassword({ current: '', next: '', repeat: '' });
        setProfile({
            first_name: user?.first_name || '',
            last_name: user?.last_name || '',
            username: user?.username || '',
            phone: user?.phone || '',
            avatar_url: user?.avatar_url || null,
        });
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
    /* eslint-enable react-hooks/set-state-in-effect */

    const go = (next) => {
        setDir(next === 'root' ? 'back' : 'forward');
        setError('');
        setPage(next);
    };

    const profileDirty = ['first_name', 'last_name', 'username', 'phone', 'avatar_url'].some((k) => (profile[k] || '') !== (user?.[k] || ''));

    const saveProfile = async () => {
        if (!profile.first_name.trim() || !profile.last_name.trim()) return setError('Escribe tu nombre y apellido.');
        setSaving(true);
        setError('');
        try {
            const data = await request('PATCH', '/users/me', {
                first_name: profile.first_name.trim(),
                last_name: profile.last_name.trim(),
                username: profile.username.trim(),
                phone: profile.phone.trim(),
                avatar_url: profile.avatar_url,
            });
            onUserUpdated(data.user);
            onToast?.('Perfil actualizado');
            go('root');
        } catch (err) {
            setError(friendlyError(err));
        } finally {
            setSaving(false);
        }
    };

    const savePassword = async () => {
        if (!password.current) return setError('Escribe tu contraseña actual.');
        if (password.next.length < MIN_PASSWORD) return setError(`La contraseña nueva necesita al menos ${MIN_PASSWORD} caracteres.`);
        if (password.next !== password.repeat) return setError('Las contraseñas nuevas no coinciden.');
        setSaving(true);
        setError('');
        try {
            await request('POST', '/users/me/password', { current_password: password.current, new_password: password.next });
            setPassword({ current: '', next: '', repeat: '' });
            onToast?.('Contraseña actualizada');
            go('root');
        } catch (err) {
            setError(friendlyError(err));
        } finally {
            setSaving(false);
        }
    };

    const pickPhoto = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setPhotoBusy(true);
        setError('');
        try {
            const avatar_url = await fileToAvatar(file);
            setProfile((p) => ({ ...p, avatar_url }));
        } catch (err) {
            setError(err.message);
        } finally {
            setPhotoBusy(false);
        }
    };

    const action = page === 'profile'
        ? { label: 'Guardar', onClick: saveProfile, disabled: !profileDirty || photoBusy, loading: saving }
        : page === 'security'
            ? { label: 'Guardar', onClick: savePassword, disabled: !password.current || !password.next || !password.repeat, loading: saving }
            : undefined;

    return (
        <>
            <Sheet
                isOpen={isOpen}
                onClose={onClose}
                title={PAGE_TITLES[page]}
                closeLabel="Cerrar"
                action={action}
                backAction={page === 'root' ? undefined : { label: 'Ajustes', onClick: () => go('root') }}
            >
                <div key={page} className={dir === 'forward' ? 'animate-month-in-forward' : 'animate-month-in-back'}>
                    {page === 'root' && <RootPage user={user} name={name} onGo={go} onLogout={() => setConfirmLogout(true)} />}
                    {page === 'profile' && (
                        <ProfilePage
                            user={user}
                            name={name}
                            form={profile}
                            setForm={setProfile}
                            onPickPhoto={pickPhoto}
                            onRemovePhoto={() => setProfile((p) => ({ ...p, avatar_url: null }))}
                            photoBusy={photoBusy}
                            error={error}
                        />
                    )}
                    {page === 'security' && <SecurityPage form={password} setForm={setPassword} error={error} />}
                    {page === 'notifications' && <NotificationsPage onToast={onToast} />}
                    {page === 'appearance' && <AppearancePage themePref={themePref} onThemeChange={onThemeChange} accent={accent} onAccentChange={onAccentChange} />}
                </div>
            </Sheet>

            <ConfirmDialog
                isOpen={confirmLogout}
                tone="danger"
                title="¿Cerrar sesión?"
                message="Tus datos quedan guardados. Vuelves a entrar con tu usuario y contraseña."
                confirmLabel="Cerrar sesión"
                onConfirm={() => { setConfirmLogout(false); onClose(); onLogout(); }}
                onCancel={() => setConfirmLogout(false)}
            />
        </>
    );
};
