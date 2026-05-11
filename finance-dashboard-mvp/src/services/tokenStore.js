/**
 * Token store con doble respaldo: memoria + localStorage.
 *
 * Motivo: iOS Safari (privado, ITP, PWA en home screen) puede bloquear
 * silenciosamente `localStorage.setItem` o quarantinearlo. Si dependemos
 * sólo de localStorage para Authorization, el flujo es:
 *   login OK → setItem falla silencioso → setState OK → render dashboard
 *   → loadData lee localStorage → null → 401 → logout/redirect.
 *
 * La fuente primaria es la variable en memoria; localStorage es best-effort.
 */

const TOKEN_KEY = 'token';

let _token = null;

function safeRead() {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

function safeWrite(value) {
    try {
        if (value) localStorage.setItem(TOKEN_KEY, value);
        else localStorage.removeItem(TOKEN_KEY);
    } catch {
        // Storage indisponible (Safari private/ITP). En memoria alcanza
        // para esta sesión; el usuario re-loguea si refresca.
    }
}

// Inicialización al cargar el módulo
_token = safeRead();

export function getToken() {
    return _token;
}

export function setToken(value) {
    _token = value || null;
    safeWrite(_token);
}

export function clearToken() {
    _token = null;
    safeWrite(null);
    try { localStorage.removeItem('user'); } catch { /* noop */ }
}

/**
 * Evento global "auth:invalid" emitido cuando el backend rechaza el token (401).
 * AuthContext escucha y limpia el estado vía React (en vez de hard redirect).
 */
export const AUTH_INVALID_EVENT = 'auth:invalid';

export function emitAuthInvalid() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(AUTH_INVALID_EVENT));
    }
}
