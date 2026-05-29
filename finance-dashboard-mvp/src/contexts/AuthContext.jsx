import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import client from '../services/client';
import { getToken, setToken, clearToken, AUTH_INVALID_EVENT } from '../services/tokenStore';
import { identifyUser, resetUser, analytics } from '../services/analytics';

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
            if (token) {
                try {
                    const res = await client.get('/auth/me', { __skipAuthRedirect: true });
                    if (!checkAuthCancelledRef.current) {
                        setUser(res.data);
                        identifyUser(res.data.id, { email: res.data.email, name: res.data.name });
                    }
                } catch (err) {
                    if (!checkAuthCancelledRef.current) {
                        // Solo borramos el token si el backend lo rechazó explícitamente (401).
                        // En cold-start de Render el request puede expirar (timeout) o fallar por
                        // red/5xx con el token aún válido — borrarlo forzaría un re-login innecesario.
                        // Conservándolo, un refresh recupera la sesión cuando el server despierta.
                        if (err?.response?.status === 401) {
                            clearToken();
                        }
                        setUser(null);
                    }
                }
            }
            clearTimeout(slowTimer);
            setSlowConnection(false);
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
            clearToken();
            setUser(null);
        };
        window.addEventListener(AUTH_INVALID_EVENT, onInvalid);
        return () => window.removeEventListener(AUTH_INVALID_EVENT, onInvalid);
    }, []);

    // Refresh proactivo del token. El access token expira a los 180min y no hay
    // refresh-token de larga vida (/auth/refresh exige un token AÚN válido). En
    // sesiones largas —típico de la PWA en el celular, que queda "abierta" días—
    // el token vence en background y la próxima acción (ej. abrir/usar Aki) da
    // 401 → logout. Acá lo renovamos mientras sigue vivo: al volver el foco
    // (throttle 5min) y cada 60min.
    useEffect(() => {
        if (!user) return;
        let lastRefresh = Date.now();
        const COOLDOWN_MS = 5 * 60 * 1000;

        const refreshSession = async () => {
            if (!getToken()) return;
            try {
                // __skipAuthRedirect: si el token YA expiró, este 401 no debe
                // disparar el logout; dejamos que lo haga el próximo request real.
                const res = await client.post('/auth/refresh', null, { __skipAuthRedirect: true });
                if (res?.data?.token) {
                    setToken(res.data.token);
                    if (res.data.user) setUser(res.data.user);
                }
                lastRefresh = Date.now();
            } catch {
                // timeout/red/5xx → token sigue válido, reintentamos en el próximo foco.
            }
        };

        const onVisible = () => {
            if (document.visibilityState === 'visible' && Date.now() - lastRefresh > COOLDOWN_MS) {
                refreshSession();
            }
        };

        const intervalId = setInterval(refreshSession, 60 * 60 * 1000);
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, [user?.id]);

    const login = useCallback(async (email, password) => {
        checkAuthCancelledRef.current = true;
        const res = await client.post('/auth/login', { email, password });
        const { token, user } = res.data;
        setToken(token);
        setUser(user);
        setLoading(false);
        identifyUser(user.id, { email: user.email, name: user.name });
        analytics.userLoggedIn('email');
        return user;
    }, []);

    const loginWithGoogle = useCallback(async (credential) => {
        checkAuthCancelledRef.current = true;
        const res = await client.post('/auth/google', { credential });
        const { token, user } = res.data;
        setToken(token);
        setUser(user);
        setLoading(false);
        identifyUser(user.id, { email: user.email, name: user.name });
        analytics.userLoggedIn('google');
        return user;
    }, []);

    const register = useCallback(async (name, email, password) => {
        checkAuthCancelledRef.current = true;
        const res = await client.post('/auth/register', { name, email, password });
        const { token, user } = res.data;
        setToken(token);
        setUser(user);
        setLoading(false);
        identifyUser(user.id, { email: user.email, name: user.name });
        analytics.userSignedUp('email');
        return user;
    }, []);

    const logout = useCallback(() => {
        analytics.userLoggedOut();
        resetUser();
        clearToken();
        setUser(null);
    }, []);

    const updateUser = useCallback((patch) => {
        setUser(prev => prev ? { ...prev, ...patch } : prev);
    }, []);

    const value = {
        user,
        login,
        loginWithGoogle,
        register,
        logout,
        updateUser,
        isAuthenticated: !!user,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? <LoadingShell slow={slowConnection} /> : children}
        </AuthContext.Provider>
    );
}
