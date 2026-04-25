import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Wallet, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { motion } from 'framer-motion';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setError('');
        setIsLoading(true);
        try {
            await loginWithGoogle(credentialResponse.credential);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Error al iniciar con Google');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors duration-500">
            {/* Background Blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 dark:bg-emerald-500/5 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] rounded-full" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full space-y-8 glass-card p-10 rounded-[2.5rem]"
            >
                <div className="text-center space-y-2">
                    <div className="mx-auto h-16 w-16 bg-gradient-to-br from-emerald-400 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/20 rotate-3 transition-transform hover:rotate-0 duration-500">
                        <Wallet className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
                        Bienvenido a <span className="premium-gradient-text">FinanceFlow</span>
                    </h2>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">
                        Tu libertad financiera comienza con un buen control.
                    </p>
                </div>

                {/* Google Sign-In */}
                <div className="space-y-4">
                    <div className="flex justify-center">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError('Error al conectar con Google')}
                            theme="filled_blue"
                            size="large"
                            width="100%"
                            shape="pill"
                            locale="es"
                        />
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px]">
                            <span className="px-4 bg-white dark:bg-zinc-900 text-zinc-400 font-black uppercase tracking-widest">
                                o usa tu correo
                            </span>
                        </div>
                    </div>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-rose-500/10 text-rose-600 dark:text-rose-400 p-4 rounded-2xl text-xs font-bold border border-rose-500/20"
                        >
                            {error}
                        </motion.div>
                    )}
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-4">Email</label>
                        <input
                            type="email"
                            required
                            className="w-full px-6 py-4 bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-2xl text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:ring-2 focus:ring-emerald-500/50 transition-all outline-none"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-4">Contraseña</label>
                        <input
                            type="password"
                            required
                            className="w-full px-6 py-4 bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-2xl text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:ring-2 focus:ring-emerald-500/50 transition-all outline-none"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full group flex items-center justify-center gap-2 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-black text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Entrar <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </>
                        )}
                    </button>
                </form>

                <div className="text-center">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                        ¿Nuevo aquí?{' '}
                        <Link to="/register" className="text-emerald-600 dark:text-emerald-400 font-black hover:underline underline-offset-4">
                            Crea una cuenta <Sparkles className="inline w-3 h-3 mb-1" />
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
