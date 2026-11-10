import { useEffect } from 'react';

// Rebote al llegar al borde: si sigues arrastrando cuando ya no hay más
// contenido, la pantalla cede un poco (cada vez con más resistencia) y al
// soltar vuelve despacio a su sitio. iPhone ya lo hace solo; esto lo iguala
// en Android y en pantallas táctiles de escritorio.
const MAX_PULL = 130;
const RETURN = 'transform 900ms cubic-bezier(0.2, 1.35, 0.4, 1)';

export const useEdgeBounce = (enabled) => {
    useEffect(() => {
        if (!enabled) return undefined;
        const shell = document.querySelector('.app-shell');
        if (!shell) return undefined;
        const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        if (isIOS || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

        let anchor = null; // dónde estaba el dedo cuando se tocó el borde
        let pulled = null; // el contenido que está desplazado ahora

        const release = () => {
            anchor = null;
            if (!pulled) return;
            pulled.style.transition = RETURN;
            pulled.style.transform = '';
            pulled = null;
        };

        const onStart = (e) => { anchor = e.touches[0].clientY; };

        const onMove = (e) => {
            // Con una hoja abierta el fondo no se mueve.
            if (anchor === null || document.documentElement.classList.contains('scroll-locked')) return;
            const y = e.touches[0].clientY;
            const pull = y - anchor;
            const atTop = shell.scrollTop <= 0;
            const atBottom = shell.scrollTop + shell.clientHeight >= shell.scrollHeight - 1;
            if (!((atTop && pull > 0) || (atBottom && pull < 0))) {
                // Todavía hay contenido por recorrer: el borde se mide desde aquí.
                anchor = y;
                if (pulled) { pulled.style.transform = ''; pulled = null; }
                return;
            }
            const content = shell.querySelector('main');
            if (!content) return;
            pulled = content;
            const offset = Math.sign(pull) * MAX_PULL * (1 - Math.exp(-Math.abs(pull) / 280));
            content.style.transition = 'none';
            content.style.transform = `translateY(${offset.toFixed(1)}px)`;
        };

        shell.addEventListener('touchstart', onStart, { passive: true });
        shell.addEventListener('touchmove', onMove, { passive: true });
        shell.addEventListener('touchend', release, { passive: true });
        shell.addEventListener('touchcancel', release, { passive: true });
        return () => {
            release();
            shell.removeEventListener('touchstart', onStart);
            shell.removeEventListener('touchmove', onMove);
            shell.removeEventListener('touchend', release);
            shell.removeEventListener('touchcancel', release);
        };
    }, [enabled]);
};
