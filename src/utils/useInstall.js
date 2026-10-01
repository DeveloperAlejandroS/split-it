import { useCallback, useEffect, useState } from 'react';

// Instalación como app. Android/escritorio (Chrome, Edge) disparan
// `beforeinstallprompt` y se puede instalar con un botón. iPhone no tiene
// ese evento: hay que explicarle a la persona el camino manual (Compartir →
// Agregar a pantalla de inicio), y solo desde Safari.
const DISMISS_KEY = 'splitit_install_dismissed';

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

let deferredPrompt = null;
const listeners = new Set();
if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        listeners.forEach((fn) => fn());
    });
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        listeners.forEach((fn) => fn());
    });
}

export const useInstall = () => {
    const [, bump] = useState(0);
    const [dismissed, setDismissed] = useState(() => {
        try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
    });

    useEffect(() => {
        const fn = () => bump((n) => n + 1);
        listeners.add(fn);
        return () => listeners.delete(fn);
    }, []);

    const installed = isStandalone();
    // 'prompt' = se puede instalar con un botón; 'ios' = instrucciones manuales.
    const mode = installed ? null : deferredPrompt ? 'prompt' : isIos() ? 'ios' : null;

    const install = useCallback(async () => {
        if (!deferredPrompt) return false;
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        deferredPrompt = null;
        bump((n) => n + 1);
        return choice.outcome === 'accepted';
    }, []);

    const dismiss = useCallback(() => {
        setDismissed(true);
        try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* sin almacenamiento: vale para esta sesión */ }
    }, []);

    return { mode, installed, dismissed, install, dismiss };
};
