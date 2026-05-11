import axios from 'axios';
import { getToken, clearToken, emitAuthInvalid } from './tokenStore';

const API_URL = import.meta.env.VITE_API_URL || 'https://finance-api-9fe5.onrender.com/api/';

const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// FastAPI con `redirect_slashes=True` redirige rutas con/sin trailing slash con 307.
// Para evitar redirects (que pueden perder body/headers en algunos navegadores),
// añadimos trailing slash sólo a URLs "limpias" (sin path parameters tipo UUID).
// - `/transactions` → `/transactions/`
// - `/transactions/{uuid}` → se deja como está (la ruta del backend no tiene barra final).
const looksLikeId = (segment) => {
    // UUID v4
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return true;
    // Numérico
    if (/^\d+$/.test(segment)) return true;
    return false;
};

client.interceptors.request.use(
    (config) => {
        if (config.url && !config.url.endsWith('/') && !config.url.includes('?')) {
            const lastSegment = config.url.split('/').filter(Boolean).pop();
            if (lastSegment && !looksLikeId(lastSegment)) {
                config.url += '/';
            }
        }

        // Fuente primaria: memoria (sobrevive a Safari ITP/private mode).
        // Fallback: localStorage si la memoria está vacía (refresh de página).
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor para manejar errores (ej. token expirado)
//
// Sólo redirige al login si el 401 viene de un endpoint de auth o de un
// recurso "core" (transacciones, cuentas, categorías). Endpoints opcionales
// como /mercadopago/* pueden fallar transitoriamente (cold start, MP API caída)
// y no deberían botar la sesión del usuario.
//
// Para forzar opt-out por request: pasar `{ __skipAuthRedirect: true }` en la config.
const AUTH_REDIRECT_BLOCKLIST = [
    /\/mercadopago\//i,
    /\/integrations\//i,
];

client.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        if (status === 401) {
            const reqUrl = (error?.config?.url || '').toString();
            const skipPerRequest = !!error?.config?.__skipAuthRedirect;
            const skipByPath = AUTH_REDIRECT_BLOCKLIST.some(rx => rx.test(reqUrl));

            if (!skipPerRequest && !skipByPath) {
                // Token expirado o inválido → emitir evento para que AuthContext
                // limpie el estado vía React (en vez de window.location.href, que
                // hacía hard reload y causaba el flash de "veo la app un seg y vuelvo
                // al login" en iOS Safari).
                clearToken();
                emitAuthInvalid();
            }
        }
        return Promise.reject(error);
    }
);

export default client;
