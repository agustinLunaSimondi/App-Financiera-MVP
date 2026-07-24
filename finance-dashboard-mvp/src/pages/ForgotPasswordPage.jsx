import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Wallet, ArrowRight, ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { parseApiError } from '../lib/apiErrors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const { forgotPassword } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;

        const trimmedEmail = email.trim().toLowerCase();
        if (!EMAIL_REGEX.test(trimmedEmail)) {
            setError('Ingresá un email válido (ej. tucorreo@gmail.com).');
            return;
        }

        setError('');
        setIsLoading(true);
        try {
            await forgotPassword(trimmedEmail);
            setSent(true);
        } catch (err) {
            setError(parseApiError(err, 'Error al procesar la solicitud'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors duration-500">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 dark:bg-emerald-500/5 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full space-y-6 sm:space-y-8 glass-card p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem]"
            >
                <div className="text-center space-y-2">
                    <div className="mx-auto h-16 w-16 bg-gradient-to-br from-emerald-400 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/20 rotate-3 transition-transform hover:rotate-0 duration-500">
                        <Wallet className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
                        Recuperar contraseña
                    </h2>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">
                        Ingresá tu email y te mandamos un link para elegir una nueva.
                    </p>
                </div>

                {sent ? (
                    <div className="text-center space-y-5 py-2">
                        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <MailCheck className="w-7 h-7 text-emerald-500" />
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Si <strong className="text-zinc-700 dark:text-zinc-200">{email.trim()}</strong> está registrado, te llegará un email con el link para recuperar tu contraseña. Puede tardar unos minutos.
                        </p>
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-sm font-black text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-4"
                        >
                            <ArrowLeft className="w-4 h-4" /> Volver a iniciar sesión
                        </Link>
                    </div>
                ) : (
                    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                role="alert"
                                className="bg-rose-500/10 text-rose-600 dark:text-rose-400 p-4 rounded-2xl text-xs font-bold border border-rose-500/20"
                            >
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="forgot-email" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-4 block">Email</label>
                            <input
                                id="forgot-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                inputMode="email"
                                spellCheck={false}
                                required
                                className="w-full px-6 py-4 bg-zinc-100 dark:bg-zinc-800/50 border-none rounded-2xl text-zinc-900 dark:text-white placeholder-zinc-400 text-sm focus:ring-2 focus:ring-emerald-500/50 transition-all outline-none"
                                placeholder="tu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            aria-disabled={isLoading}
                            aria-busy={isLoading}
                            className="w-full group flex items-center justify-center gap-2 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-black text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Enviando…</span>
                                </>
                            ) : (
                                <>
                                    Enviar link <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </button>

                        <div className="text-center">
                            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 font-medium hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                                <ArrowLeft className="w-3.5 h-3.5" /> Volver a iniciar sesión
                            </Link>
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    );
}
