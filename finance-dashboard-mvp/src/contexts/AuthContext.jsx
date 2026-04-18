import React, { createContext, useState, useEffect, useContext } from 'react';
import client from '../services/client';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

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

    const login = async (email, password) => {
        const res = await client.post('/auth/login', { email, password });
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        setUser(user);
        return user;
    };

    // Google Sign-In: sends the credential token to the backend for verification
    const loginWithGoogle = async (credential) => {
        const res = await client.post('/auth/google', { credential });
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        setUser(user);
        return user;
    };

    const register = async (name, email, password) => {
        const res = await client.post('/auth/register', { name, email, password });
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        setUser(user);
        return user;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

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
            {!loading && children}
        </AuthContext.Provider>
    );
}
