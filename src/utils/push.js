import { API_URL } from '../config/api';

// Notificaciones push (Web Push). En iPhone solo existen cuando la app está
// agregada a la pantalla de inicio (iOS 16.4+); en Android y escritorio
// funcionan también en el navegador.
const TOKEN_KEY = 'splitit_jwt';

const authHeaders = () => ({ 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` });

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const urlBase64ToUint8Array = (base64) => {
    const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(padded);
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const registration = async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) throw new Error('La app todavía no terminó de instalarse en este navegador. Recarga e intenta de nuevo.');
    return reg;
};

// 'unsupported' | 'denied' | 'on' | 'off'
export const getPushState = async () => {
    if (!pushSupported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        return sub ? 'on' : 'off';
    } catch {
        return 'off';
    }
};

export const enablePush = async () => {
    const res = await fetch(`${API_URL}/push/config`, { headers: authHeaders() });
    const config = await res.json();
    if (!res.ok || !config.enabled) throw new Error('El servidor todavía no tiene activadas las notificaciones.');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('No diste permiso para notificaciones. Puedes cambiarlo en los ajustes del navegador.');

    const reg = await registration();
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(config.public_key) });
    const saved = await fetch(`${API_URL}/push/subscribe`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(sub.toJSON()) });
    if (!saved.ok) {
        await sub.unsubscribe().catch(() => {});
        throw new Error('No se pudo guardar la suscripción. Intenta de nuevo.');
    }
};

export const disablePush = async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await fetch(`${API_URL}/push/unsubscribe`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
    await sub.unsubscribe();
};

export const sendTestPush = async () => {
    const res = await fetch(`${API_URL}/push/test`, { method: 'POST', headers: authHeaders() });
    if (!res.ok) throw new Error('No se pudo enviar la prueba.');
};
