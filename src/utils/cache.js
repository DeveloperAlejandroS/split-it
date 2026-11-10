// Última foto buena de los datos, para pintar la app al instante al abrirla
// (el servidor puede tardar en despertar) en vez de esperar con la pantalla en
// blanco. Vive en este dispositivo y se borra al cerrar sesión.
const PREFIX = 'splitit_cache_';

export const readCache = (name) => {
    try { return JSON.parse(localStorage.getItem(PREFIX + name)); } catch { return null; }
};

export const writeCache = (name, data) => {
    try { localStorage.setItem(PREFIX + name, JSON.stringify(data)); } catch { /* sin espacio: se sigue sin caché */ }
};

export const clearCache = () => {
    try { Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k)); } catch { /* sin almacenamiento */ }
};
