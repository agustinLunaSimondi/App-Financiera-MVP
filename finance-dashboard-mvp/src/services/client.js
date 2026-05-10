import axios from 'axios';

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

        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor para manejar errores (ej. token expirado)
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token expirado o inválido → limpiar sesión
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Redirigir a login si no estamos ya ahí (evita loops y mejora UX)
            if (typeof window !== 'undefined' &&
                !['/login', '/register'].includes(window.location.pathname)) {
                // Pequeño retraso para dejar pasar este ciclo de error
                setTimeout(() => {
                    if (!['/login', '/register'].includes(window.location.pathname)) {
                        window.location.href = '/login';
                    }
                }, 50);
            }
        }
        return Promise.reject(error);
    }
);

export default client;
