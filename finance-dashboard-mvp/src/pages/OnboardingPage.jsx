import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFinance } from '../hooks/useFinance';
import { addTransaction, completeOnboarding } from '../services/api';
import { analytics, amountRange } from '../services/analytics';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Sparkles } from 'lucide-react';

const CATEGORY_BUTTONS = [
    { emoji: '🍔', label: 'Comida', name: 'Alimentación' },
    { emoji: '🚗', label: 'Transporte', name: 'Transporte' },
    { emoji: '🎮', label: 'Entrete.', name: 'Entretenimiento' },
    { emoji: '🛍️', label: 'Compras', name: 'Compras' },
    { emoji: '💡', label: 'Servicios', name: 'Servicios' },
    { emoji: '💊', label: 'Salud', name: 'Salud' },
    { emoji: '📌', label: 'Otros', name: 'Otros Gastos' },
];

export function OnboardingPage() {
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const { categories, accounts } = useFinance();

    const [step, setStep] = useState(1);
    const [amount, setAmount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [savedExpense, setSavedExpense] = useState(null);

    const firstName = user?.name?.split(' ')[0] || 'ahí';

    const handleExpenseSubmit = async (e) => {
        e.preventDefault();
        if (!amount || !selectedCategory) return;
        setSubmitting(true);

        try {
            // Buscar cuenta y categoría por nombre
            const account = accounts[0];
            const category = categories.find(c =>
                c.name === selectedCategory.name && c.type === 'EXPENSE'
            );

            if (!account || !category) {
                // fallback: avanzar igual aunque no se guarde la tx
                setSavedExpense({ amount, category: selectedCategory });
                setStep(3);
                return;
            }

            const parsedAmount = parseFloat(amount.replace(',', '.'));
            await addTransaction({
                accountId: account.id,
                categoryId: category.id,
                amount: -Math.abs(parsedAmount),
                description: description.trim() || `${selectedCategory.emoji} ${selectedCategory.label}`,
                transactionDate: new Date().toISOString().split('T')[0],
            });

            analytics.expenseAdded(selectedCategory.name, amountRange(parsedAmount));
            setSavedExpense({ amount: parsedAmount, category: selectedCategory });
            setStep(3);
        } catch {
            // No bloquear el onboarding si falla guardar la tx
            setSavedExpense({ amount: parseFloat(amount) || 0, category: selectedCategory });
            setStep(3);
        } finally {
            setSubmitting(false);
        }
    };

    const handleFinish = async () => {
        try {
            await completeOnboarding();
            analytics.onboardingCompleted();
            updateUser({ onboardingCompleted: true });
        } catch {
            // Si falla el endpoint, igual avanzamos — no bloqueamos al usuario
            updateUser({ onboardingCompleted: true });
        }
        navigate('/', { replace: true });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center p-4">
            {/* Progress bar */}
            <div className="fixed top-0 left-0 right-0 h-1 bg-zinc-200 dark:bg-zinc-800">
                <motion.div
                    className="h-full bg-emerald-500"
                    initial={{ width: '0%' }}
                    animate={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
                    transition={{ duration: 0.4 }}
                />
            </div>

            <div className="w-full max-w-md">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -24 }}
                            transition={{ duration: 0.3 }}
                            className="text-center space-y-8"
                        >
                            <div className="space-y-4">
                                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto">
                                    <Sparkles className="w-8 h-8 text-emerald-500" />
                                </div>
                                <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                                    Hola, {firstName} 👋
                                </h1>
                                <p className="text-zinc-500 dark:text-zinc-400 font-medium text-lg leading-relaxed">
                                    Bienvenido a tu asistente financiero.
                                </p>
                                <p className="text-zinc-400 dark:text-zinc-500 text-sm leading-relaxed max-w-xs mx-auto">
                                    Vamos a registrar tu primer gasto en menos de 2 minutos.
                                    Así podés empezar a ver en qué va tu plata.
                                </p>
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-500/20 transition-all active:scale-95 group"
                            >
                                Empezar
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </button>

                            <p className="text-xs text-zinc-400">Paso 1 de 3</p>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -24 }}
                            transition={{ duration: 0.3 }}
                        >
                            <form onSubmit={handleExpenseSubmit} className="space-y-6">
                                <div className="text-center space-y-2">
                                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                                        ¿En qué gastaste plata hoy?
                                    </h2>
                                    <p className="text-zinc-400 text-sm">Ingresá el monto y elegí la categoría</p>
                                </div>

                                {/* Amount input */}
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-black text-xl">$</span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        placeholder="0"
                                        min="0"
                                        step="any"
                                        required
                                        autoFocus
                                        className="w-full pl-10 pr-4 py-4 text-2xl font-black text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:border-emerald-500 transition-colors"
                                        style={{ fontSize: '1.5rem' }}
                                    />
                                </div>

                                {/* Category grid */}
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">Categoría</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {CATEGORY_BUTTONS.map(cat => (
                                            <button
                                                key={cat.name}
                                                type="button"
                                                onClick={() => setSelectedCategory(cat)}
                                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all active:scale-95 ${
                                                    selectedCategory?.name === cat.name
                                                        ? 'border-emerald-500 bg-emerald-500/10'
                                                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-800'
                                                }`}
                                            >
                                                <span className="text-xl">{cat.emoji}</span>
                                                <span className={`text-[10px] font-bold ${
                                                    selectedCategory?.name === cat.name
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-zinc-500 dark:text-zinc-400'
                                                }`}>{cat.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Description (optional) */}
                                <input
                                    type="text"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Descripción (opcional) — ej: almuerzo en el trabajo"
                                    className="w-full px-4 py-3 text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-400"
                                />

                                <button
                                    type="submit"
                                    disabled={!amount || !selectedCategory || submitting}
                                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
                                >
                                    {submitting ? 'Guardando...' : 'Guardar mi primer gasto'}
                                    {!submitting && <ArrowRight className="w-4 h-4" />}
                                </button>

                                <p className="text-center text-xs text-zinc-400">Paso 2 de 3</p>
                            </form>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className="text-center space-y-8"
                        >
                            <div className="space-y-4">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                                    className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30"
                                >
                                    <Check className="w-10 h-10 text-white" strokeWidth={3} />
                                </motion.div>

                                <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                                    ¡Perfecto!
                                </h2>
                                <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                                    Registraste tu primer gasto.
                                </p>

                                {savedExpense && (
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                        <span className="text-lg">{savedExpense.category?.emoji}</span>
                                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                            ${Number(savedExpense.amount).toLocaleString('es-AR')} en {savedExpense.category?.label}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl p-4 text-left space-y-2">
                                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">¿Y ahora?</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                    Seguí registrando tus gastos esta semana. En 7 días vas a ver tus primeros patrones de gasto y cuánto ahorrás.
                                </p>
                            </div>

                            <button
                                onClick={handleFinish}
                                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-zinc-900 dark:bg-white hover:bg-zinc-700 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-black text-sm transition-all active:scale-95 group"
                            >
                                Ir al dashboard
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </button>

                            <p className="text-xs text-zinc-400">Paso 3 de 3</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
