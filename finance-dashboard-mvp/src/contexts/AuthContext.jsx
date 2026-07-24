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

    // Sliding session con techo de INACTIVIDAD de 1h (L3). El access token expira
    // a los 60min (ACCESS_TOKEN_EXPIRE_MINUTES en el backend) y /auth/refresh exige
    // un token aún válido. Mientras haya ACTIVIDAD del usuario renovamos el token
    // antes de que venza (cada 45min < 60min de TTL). Tras 60min sin actividad NO se
    // renueva → el token expira → la próxima acción da 401 → re-login.
    // Nota: el corte duro de seguridad es el TTL de 60min server-side; el logout en
    // cliente ocurre dentro de ~1h de inactividad (puede arrastrar hasta el venc.
    // del último token emitido).
    useEffect(() => {
        if (!user) return;
        const TTL_MS = 60 * 60 * 1000;           // debe coincidir con el TTL del backend
        const REFRESH_EVERY_MS = 45 * 60 * 1000; // < TTL para renovar antes de expirar
        const COOLDOWN_MS = 5 * 60 * 1000;
        let lastRefresh = Date.now();
        let lastActivity = Date.now();

        const markActivity = () => { lastActivity = Date.now(); };

        const refreshSession = async () => {
            if (!getToken()) return;
            // Techo de inactividad: sin actividad en la última hora no renovamos →
            // el token se deja expirar y el usuario re-loguea.
            if (Date.now() - lastActivity > TTL_MS) return;
            try {
                // __skipAuthRedirect: si el token YA expiró, este 401 no debe
                // disparar el logout; lo hará el próximo request real.
                const res = await client.post('/auth/refresh', null, { __skipAuthRedirect: true });
                if (res?.data?.token) {
                    setToken(res.data.token);
                    if (res.data.user) setUser(res.data.user);
                }
                lastRefresh = Date.now();
            } catch {
                // timeout/red/5xx → token sigue válido, reintentamos en el próximo ciclo/foco.
            }
        };

        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                markActivity();
                if (Date.now() - lastRefresh > COOLDOWN_MS) refreshSession();
            }
        };

        const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, markActivity, { passive: true }));

        const intervalId = setInterval(refreshSession, REFRESH_EVERY_MS);
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);

        return () => {
            clearInterval(intervalId);
            ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, markActivity));
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

    const forgotPassword = useCallback(async (email) => {
        await client.post('/auth/forgot-password', { email });
    }, []);

    const resetPassword = useCallback(async (token, newPassword) => {
        const res = await client.post('/auth/reset-password', { token, newPassword });
        const { token: authToken, user } = res.data;
        setToken(authToken);
        setUser(user);
        setLoading(false);
        identifyUser(user.id, { email: user.email, name: user.name });
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
        forgotPassword,
        resetPassword,
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
