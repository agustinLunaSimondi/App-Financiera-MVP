import axios from 'axios';
import { getToken, clearToken, emitAuthInvalid } from './tokenStore';

const API_URL = import.meta.env.VITE_API_URL || 'https://finance-api-9fe5.onrender.com/api/';

const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

const looksLikeId = (segment) => {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return true;
    if (/^\d+$/.test(segment)) return true;
    return false;
};

// FastAPI redirige con 307 cuando el trailing slash no coincide con la definición de la ruta.
// iOS Safari stripea el Authorization header en esos redirects — causa 401 silencioso.
//
// Regla: solo agregar slash a rutas de colección (un único segmento no-ID, ej. /transactions).
// Rutas con dos segmentos no-ID (ej. /auth/me, /mercadopago/status) están definidas SIN
// trailing slash en el backend — agregarla causaría el redirect que rompe el auth en iOS.
client.interceptors.request.use(
    (config) => {
        if (config.url && !config.url.endsWith('/') && !config.url.includes('?')) {
            const segments = config.url.split('/').filter(Boolean);
            const lastSegment = segments[segments.length - 1];
            if (!looksLikeId(lastSegment)) {
                const nonIdSegments = segments.filter(s => !looksLikeId(s));
                if (nonIdSegments.length <= 1) {
                    config.url += '/';
                }
            }
        }

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
                clearToken();
                emitAuthInvalid();
            }
        }
        return Promise.reject(error);
    }
);

export default client;
