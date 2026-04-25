import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://finance-api-9fe5.onrender.com/api/';

const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor para agregar token y asegurar barra final (crucial para evitar 301/CORS en Render/Django)
client.interceptors.request.use(
    (config) => {
        // Asegurar barra final
        if (config.url && !config.url.endsWith('/') && !config.url.includes('?')) {
            config.url += '/';
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
            // Token expirado o inválido
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Opcional: Redirigir a login, pero mejor manejarlo en el componente o contexto
            // window.location.href = '/login'; 
        }
        return Promise.reject(error);
    }
);

export default client;
