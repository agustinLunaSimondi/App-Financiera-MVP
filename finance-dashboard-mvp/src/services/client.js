import axios from 'axios';
import { getToken, clearToken, emitAuthInvalid } from './tokenStore';

const API_URL = import.meta.env.VITE_API_URL || 'https://finance-api-9fe5.onrender.com/api/';

const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 30000, // 30s — cubre cold-starts de Render
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
//
// Excepción: endpoints de un solo segmento definidos en el backend con `@router.post("")`
// (sin slash) — ej. /chat, /waitlist. La heurística los trataría como colección y agregaría
// slash, provocando el 307 → strip de Authorization en iOS → 401 → logout. Se excluyen.
const NO_TRAILING_SLASH = [
    /^\/?chat$/i,
    /^\/?waitlist$/i,
];

client.interceptors.request.use(
    (config) => {
        if (config.url && !config.url.endsWith('/') && !config.url.includes('?')) {
            const isNoSlashRoute = NO_TRAILING_SLASH.some(rx => rx.test(config.url));
            const segments = config.url.split('/').filter(Boolean);
            const lastSegment = segments[segments.length - 1];
            if (!isNoSlashRoute && !looksLikeId(lastSegment)) {
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

// Interceptor de respuesta
// - 401: redirige al login solo para endpoints de auth/core. Endpoints opcionales (MP) no botan sesión.
// - 502/503/504: reintenta una vez con backoff corto (cubre cold start de Render).
const AUTH_REDIRECT_BLOCKLIST = [
    /\/mercadopago\//i,
    /\/integrations\//i,
];

const RETRY_STATUS = new Set([502, 503, 504]);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error?.response?.status;
        const config = error?.config;

        // Auto-retry para errores transitorios (cold start típico)
        if (config && !config.__noRetry && (RETRY_STATUS.has(status) || error.code === 'ECONNABORTED')) {
            if (!config.__retryCount) config.__retryCount = 0;
            if (config.__retryCount < 1) {
                config.__retryCount += 1;
                await sleep(1500);
                return client(config);
            }
        }

        if (status === 401) {
            const reqUrl = (config?.url || '').toString();
            const skipPerRequest = !!config?.__skipAuthRedirect;
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
