// Actualización de la app instalada. Una PWA no tiene F5: sin esto, la versión
// nueva solo se veía cerrando y abriendo la app dos veces.
//
// - Al volver a la app (y cada hora si queda abierta) se pregunta al servidor
//   si hay versión nueva.
// - Cuando el service worker nuevo toma el control, la página se recarga sola.
//   Si la persona está escribiendo o tiene una hoja abierta, se espera a que
//   termine para no perderle nada.
const CHECK_EVERY_MS = 60 * 60 * 1000;

const isBusy = () => {
    const el = document.activeElement;
    const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    return typing || document.querySelector('[role="dialog"], [role="alertdialog"]') !== null;
};

export const setupAppUpdates = () => {
    if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;

    // Solo recargar si ya había una versión controlando la página: la primera
    // instalación también dispara `controllerchange` y ahí no hay nada que actualizar.
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;

    const reloadWhenIdle = () => {
        if (reloading) return;
        if (isBusy()) {
            setTimeout(reloadWhenIdle, 3000);
            return;
        }
        reloading = true;
        window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hadController) reloadWhenIdle();
    });

    const check = () => {
        if (document.visibilityState !== 'visible') return;
        navigator.serviceWorker.getRegistration().then((reg) => reg?.update()).catch(() => {});
    };

    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    setInterval(check, CHECK_EVERY_MS);
};
