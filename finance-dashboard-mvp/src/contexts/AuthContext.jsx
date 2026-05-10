import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import client from '../services/client';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

const LoadingShell = () => (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" aria-label="Cargando" />
    </div>
);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await client.get('/auth/me');
                    setUser(res.data);
                } catch (error) {
                    console.error("Error verificando sesión:", error);
                    localStorage.removeItem('token');
                    setUser(null);
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const login = useCallback(async (email, password) => {
        const res = await client.post('/auth/login', { email, password });
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        setUser(user);
        return user;
    }, []);

    // Google Sign-In: sends the credential token to the backend for verification
    const loginWithGoogle = useCallback(async (credential) => {
        const res = await client.post('/auth/google', { credential });
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        setUser(user);
        return user;
    }, []);

    const register = useCallback(async (name, email, password) => {
        const res = await client.post('/auth/register', { name, email, password });
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        setUser(user);
        return user;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
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
            {loading ? <LoadingShell /> : children}
        </AuthContext.Provider>
    );
}

