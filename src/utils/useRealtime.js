import { useEffect, useRef } from 'react';
import { API_URL } from '../config/api';

// Tiempo real: una conexión WebSocket con la API que solo recibe avisos de
// "algo cambió" (expenses.changed, friends.changed). Al recibir uno se llama
// a onSignal, que vuelve a pedir los datos por la API de siempre.
//
// Se reconecta sola (con espera creciente) y al volver la red o la pestaña.
// Cada vez que RE-conecta también avisa, porque pudo perderse algo mientras
// estuvo caída. Si el WebSocket no está disponible, la app sigue funcionando
// con la consulta periódica.
const TOKEN_KEY = 'splitit_jwt';
const WS_URL = `${API_URL.replace(/^http/, 'ws').replace(/\/$/, '')}/ws`;
const MAX_BACKOFF_MS = 30000;
const DEBOUNCE_MS = 300;

export const useRealtime = (enabled, onSignal) => {
    const onSignalRef = useRef(onSignal);
    useEffect(() => { onSignalRef.current = onSignal; });

    useEffect(() => {
        if (!enabled || typeof WebSocket === 'undefined') return undefined;

        let ws = null;
        let stopped = false;
        let attempts = 0;
        let hadConnection = false;
        let retryTimer = null;
        let signalTimer = null;

        // Varias señales seguidas (p. ej. un gasto con cinco personas) = un solo refresco.
        const signal = (type) => {
            clearTimeout(signalTimer);
            signalTimer = setTimeout(() => onSignalRef.current?.(type), DEBOUNCE_MS);
        };

        const scheduleRetry = () => {
            if (stopped) return;
            clearTimeout(retryTimer);
            const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempts) + Math.random() * 500;
            attempts += 1;
            retryTimer = setTimeout(connect, delay);
        };

        function connect() {
            if (stopped) return;
            if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
            const token = localStorage.getItem(TOKEN_KEY);
            if (!token) return;
            try {
                ws = new WebSocket(WS_URL);
            } catch {
                scheduleRetry();
                return;
            }
            const socket = ws;
            socket.onopen = () => socket.send(JSON.stringify({ type: 'auth', token }));
            socket.onmessage = (event) => {
                let msg;
                try { msg = JSON.parse(event.data); } catch { return; }
                if (msg.type === 'ready') {
                    attempts = 0;
                    if (hadConnection) signal('reconnected');
                    hadConnection = true;
                    return;
                }
                signal(msg.type);
            };
            socket.onclose = (event) => {
                // 4001 = token rechazado: reintentar no sirve hasta iniciar sesión de nuevo.
                if (event.code === 4001) return;
                scheduleRetry();
            };
            socket.onerror = () => { /* onclose se encarga */ };
        }

        const wake = () => {
            if (document.visibilityState !== 'visible') return;
            if (!ws || ws.readyState === WebSocket.CLOSED) { attempts = 0; clearTimeout(retryTimer); connect(); }
        };

        connect();
        document.addEventListener('visibilitychange', wake);
        window.addEventListener('online', wake);

        return () => {
            stopped = true;
            clearTimeout(retryTimer);
            clearTimeout(signalTimer);
            document.removeEventListener('visibilitychange', wake);
            window.removeEventListener('online', wake);
            if (ws) { ws.onclose = null; ws.close(); }
        };
    }, [enabled]);
};
