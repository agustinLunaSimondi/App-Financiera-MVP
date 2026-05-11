import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import client from '../services/client';
import { getToken, setToken, clearToken, AUTH_INVALID_EVENT } from '../services/tokenStore';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

const LoadingShell = ({ slow }) => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950 p-6">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" aria-label="Cargando" />
        {slow && (
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 text-center max-w-xs">
                Despertando el servidor… esto puede tardar unos segundos la primera vez.
            </p>
        )}
    </div>
);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [slowConnection, setSlowConnection] = useState(false);
    // Previene que el catch de checkAuth pise el estado seteado por login() activo.
    const checkAuthCancelledRef = useRef(false);

    useEffect(() => {
        checkAuthCancelledRef.current = false;
        const slowTimer = setTimeout(() => setSlowConnection(true), 5000);

        const checkAuth = async () => {
            const token = getToken();
            console.log('[AUTH] checkAuth start — token en memoria:', token ? token.slice(0, 20) + '…' : 'null');
            if (token) {
                try {
                    console.log('[AUTH] GET /auth/me enviado');
                    const res = await client.get('/auth/me', { __skipAuthRedirect: true });
                    console.log('[AUTH] GET /auth/me OK — cancelled?', checkAuthCancelledRef.current);
                    if (!checkAuthCancelledRef.current) {
                        setUser(res.data);
                    }
                } catch (error) {
                    console.warn('[AUTH] GET /auth/me ERROR', error?.response?.status, '— cancelled?', checkAuthCancelledRef.current);
                    if (!checkAuthCancelledRef.current) {
                        clearToken();
                        setUser(null);
                    }
                }
            }
            clearTimeout(slowTimer);
            setSlowConnection(false);
            console.log('[AUTH] checkAuth fin — cancelled?', checkAuthCancelledRef.current, '— setLoading(false)?', !checkAuthCancelledRef.current);
            if (!checkAuthCancelledRef.current) {
                setLoading(false);
            }
        };
        checkAuth();

        return () => {
            checkAuthCancelledRef.current = true;
            clearTimeout(slowTimer);
        };
    }, []);

    // Cuando el interceptor emite 'auth:invalid' (porque algún endpoint
    // devolvió 401 fuera de la blocklist), limpiamos via React — sin hard
    // reload — para que el ProtectedLayout redirija a /login naturalmente.
    useEffect(() => {
        const onInvalid = () => {
            console.warn('[AUTH] auth:invalid recibido — haciendo logout');
            clearToken();
            setUser(null);
        };
        window.addEventListener(AUTH_INVALID_EVENT, onInvalid);
        return () => window.removeEventListener(AUTH_INVALID_EVENT, onInvalid);
    }, []);

    const login = useCallback(async (email, password) => {
        console.log('[AUTH] login() iniciado — cancelando checkAuth');
        checkAuthCancelledRef.current = true;
        const res = await client.post('/auth/login', { email, password });
        const { token, user } = res.data;
        console.log('[AUTH] login() OK — token recibido:', token ? token.slice(0, 20) + '…' : 'null');
        setToken(token);
        setUser(user);
        setLoading(false);
        return user;
    }, []);

    const loginWithGoogle = useCallback(async (credential) => {
        checkAuthCancelledRef.current = true;
        const res = await client.post('/auth/google', { credential });
        const { token, user } = res.data;
        setToken(token);
        setUser(user);
        setLoading(false);
        return user;
    }, []);

    const register = useCallback(async (name, email, password) => {
        checkAuthCancelledRef.current = true;
        const res = await client.post('/auth/register', { name, email, password });
        const { token, user } = res.data;
        setToken(token);
        setUser(user);
        setLoading(false);
        return user;
    }, []);

    const logout = useCallback(() => {
        clearToken();
        setUser(null);
    }, []);

    const value = {
        user,
        login,
        loginWithGoogle,
        register,
        logout,
        isAuthenticated: !!user,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? <LoadingShell slow={slowConnection} /> : children}
        </AuthContext.Provider>
    );
}
