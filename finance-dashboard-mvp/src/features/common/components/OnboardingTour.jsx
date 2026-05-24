/**
 * OnboardingTour.jsx
 * Shows a guided tour for first-time users.
 * Automatically displays on first login. The user can skip at any time.
 * State is persisted in localStorage under 'onboarding_complete'.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Wallet, PieChart, PiggyBank,
    ArrowRight, X, CheckCircle2, Sparkles
} from 'lucide-react';

const STORAGE_KEY = 'vuelto_onboarding_done';

// ─── Steps Definition ─────────────────────────────────────
const STEPS = [
    {
        id: 'welcome',
        icon: Sparkles,
        iconColor: 'from-emerald-400 to-blue-500',
        title: '¡Bienvenido a Vuelto!',
        description: 'Tu plata, sin que te roben el bolsillo. En menos de 2 minutos te mostramos cómo funciona.',
        hint: null,
        cta: 'Comenzar tour',
    },
    {
        id: 'dashboard',
        icon: LayoutDashboard,
        iconColor: 'from-blue-400 to-blue-600',
        title: 'Panel de Control',
        description: 'Aquí encontrás un resumen en tiempo real de tu balance, ingresos, gastos y tendencias del mes. Es tu página de inicio.',
        hint: '📍 Panel principal → siempre disponible en el menú lateral',
        cta: 'Siguiente',
    },
    {
        id: 'transactions',
        icon: Wallet,
        iconColor: 'from-violet-400 to-purple-600',
        title: 'Transacciones',
        description: 'Registrá cada ingreso o gasto. Podés crear categorías nuevas directamente al cargar una transacción, sin salir del formulario.',
        hint: '💡 Tip: En el formulario hay un botón "+ Nueva" junto al selector de categoría',
        cta: 'Siguiente',
    },
    {
        id: 'budgets',
        icon: PieChart,
        iconColor: 'from-amber-400 to-orange-500',
        title: 'Presupuestos',
        description: 'Definí límites de gasto por categoría cada mes. Cuando te acercás al límite, la app te lo avisa visualmente.',
        hint: '📊 Las barras de progreso se vuelven rojas cuando superás el 80%',
        cta: 'Siguiente',
    },
    {
        id: 'savings',
        icon: PiggyBank,
        iconColor: 'from-emerald-400 to-teal-600',
        title: 'Metas de Ahorro',
        description: 'Creá objetivos financieros: un viaje, un fondo de emergencia, o lo que quieras. Registrá cada contribución y seguí el progreso.',
        hint: '🎯 Podés tener varias metas activas al mismo tiempo',
        cta: 'Siguiente',
    },
    {
        id: 'done',
        icon: CheckCircle2,
        iconColor: 'from-emerald-400 to-emerald-600',
        title: '¡Todo listo!',
        description: 'Ya sabés lo esencial. Si tenés más dudas, visitá la sección Ayuda / Tutorial. ¡Empezá a registrar tus finanzas!',
        hint: null,
        cta: 'Ir al Dashboard',
    },
];

// ─── Progress Dots ────────────────────────────────────────
function Dots({ current, total }) {
    return (
        <div className="flex gap-2 justify-center">
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    className={`h-2 rounded-full transition-all duration-300 ${i === current
                        ? 'w-6 bg-emerald-500'
                        : i < current
                            ? 'w-2 bg-emerald-300 dark:bg-emerald-700'
                            : 'w-2 bg-zinc-200 dark:bg-zinc-700'
                    }`}
                />
            ))}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────
export function OnboardingTour() {
    const [step, setStep] = useState(0);
    const [visible, setVisible] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const done = localStorage.getItem(STORAGE_KEY);
        if (!done) {
            // Short delay so the dashboard has time to render first
            const timer = setTimeout(() => setVisible(true), 800);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        setVisible(false);
    };

    const handleNext = () => {
        if (step < STEPS.length - 1) {
            setStep(s => s + 1);
        } else {
            handleDismiss();
            navigate('/');
        }
    };

    if (!visible) return null;

    const current = STEPS[step];
    const Icon = current.icon;

    return (
        <AnimatePresence>
            {visible && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop — sin onClick. Forzamos cierre con el botón X o "Saltar"
                        para que un toque accidental no descarte el tour entero. */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/50 backdrop-blur-md"
                    />

                    {/* Card */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, scale: 0.92, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: -10 }}
                            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                            className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden z-10"
                        >
                            {/* Gradient Banner */}
                            <div className={`h-2 w-full bg-gradient-to-r ${current.iconColor}`} />

                            {/* Close */}
                            <button
                                onClick={handleDismiss}
                                className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                            >
                                <X size={18} />
                            </button>

                            <div className="p-8 space-y-6">
                                {/* Icon */}
                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${current.iconColor} flex items-center justify-center shadow-lg`}>
                                    <Icon className="w-8 h-8 text-white" />
                                </div>

                                {/* Text */}
                                <div className="space-y-3">
                                    <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 leading-tight">
                                        {current.title}
                                    </h2>
                                    <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                        {current.description}
                                    </p>
                                    {current.hint && (
                                        <div className="px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-600 dark:text-zinc-300">
                                            {current.hint}
                                        </div>
                                    )}
                                </div>

                                {/* Progress */}
                                <Dots current={step} total={STEPS.length} />

                                {/* Actions */}
                                <div className="flex items-center justify-between gap-3">
                                    <button
                                        onClick={handleDismiss}
                                        className="text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                                    >
                                        Saltar
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-bold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0"
                                    >
                                        {current.cta}
                                        {step < STEPS.length - 1 && <ArrowRight size={16} />}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            )}
        </AnimatePresence>
    );
}

/**
 * Helper to reset the onboarding (e.g. from Settings).
 * Call this to show the tour again on next visit.
 */
export function resetOnboarding() {
    localStorage.removeItem(STORAGE_KEY);
}
