import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFinance } from '../hooks/useFinance';
import {
    addTransaction,
    addBudget,
    addSavingGoal,
    addRecurring,
    completeOnboarding,
    getMercadoPagoAuthUrl,
} from '../services/api';
import { getToken } from '../services/tokenStore';
import { analytics, amountRange } from '../services/analytics';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight, Check, Sparkles, SkipForward,
    Target, PiggyBank, Repeat, CreditCard, Loader2,
} from 'lucide-react';

const CATEGORY_BUTTONS = [
    { emoji: '🍔', label: 'Comida', name: 'Alimentación' },
    { emoji: '🚗', label: 'Transporte', name: 'Transporte' },
    { emoji: '🎮', label: 'Entrete.', name: 'Entretenimiento' },
    { emoji: '🛍️', label: 'Compras', name: 'Compras' },
    { emoji: '💡', label: 'Servicios', name: 'Servicios' },
    { emoji: '💊', label: 'Salud', name: 'Salud' },
    { emoji: '📌', label: 'Otros', name: 'Otros Gastos' },
];

const FREQUENCIES = [
    { value: 'MONTHLY', label: 'Mensual' },
    { value: 'WEEKLY', label: 'Semanal' },
    { value: 'BIWEEKLY', label: 'Quincenal' },
    { value: 'YEARLY', label: 'Anual' },
];

const STEP_NAMES = {
    1: 'welcome',
    2: 'expense',
    3: 'budget',
    4: 'savings',
    5: 'recurring',
    6: 'mercadopago',
    7: 'done',
};
const TOTAL_ACTION_STEPS = 5;

export function OnboardingPage() {
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const { categories, accounts, refreshData } = useFinance();

    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    // Paso 2: Primer gasto
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseCategory, setExpenseCategory] = useState(null);
    const [expenseDescription, setExpenseDescription] = useState('');
    const [savedExpense, setSavedExpense] = useState(null);

    // Paso 3: Presupuesto
    const [budgetAmount, setBudgetAmount] = useState('');
    const [budgetCategory, setBudgetCategory] = useState(null);

    // Paso 4: Meta de ahorro
    const [goalName, setGoalName] = useState('');
    const [goalAmount, setGoalAmount] = useState('');
    const [goalDeadline, setGoalDeadline] = useState('');

    // Paso 5: Recurrente
    const [recurringType, setRecurringType] = useState('INCOME');
    const [recurringDescription, setRecurringDescription] = useState('');
    const [recurringAmount, setRecurringAmount] = useState('');
    const [recurringFrequency, setRecurringFrequency] = useState('MONTHLY');
    const [recurringCategoryId, setRecurringCategoryId] = useState(null);

    // Paso 6: MP
    const [mpRedirecting, setMpRedirecting] = useState(false);

    const firstName = user?.name?.split(' ')[0] || 'ahí';

    const progress = useMemo(() => {
        if (step === 1) return 0;
        if (step === 7) return 100;
        return Math.round(((step - 1) / TOTAL_ACTION_STEPS) * 100);
    }, [step]);

    const expenseCategories = useMemo(
        () => categories.filter(c => c.type === 'EXPENSE'),
        [categories]
    );
    const incomeCategories = useMemo(
        () => categories.filter(c => c.type === 'INCOME'),
        [categories]
    );

    const finishOnboarding = async ({ navigateAway = true } = {}) => {
        try {
            await completeOnboarding();
            analytics.onboardingCompleted();
        } catch {
            // ignoramos — no bloqueamos al usuario
        }
        updateUser({ onboardingCompleted: true });
        if (navigateAway) navigate('/', { replace: true });
    };

    const trackStepCompleted = (s) => analytics.onboardingStepCompleted(STEP_NAMES[s]);
    const trackStepSkipped = (s) => analytics.onboardingStepSkipped(STEP_NAMES[s]);

    // ─── Paso 2: Primer gasto ──────────────────────────────────────────────
    const handleExpenseSubmit = async (e) => {
        e.preventDefault();
        if (!expenseAmount || !expenseCategory) return;
        setSubmitting(true);
        try {
            const account = accounts[0];
            const category = expenseCategories.find(c => c.name === expenseCategory.name);

            if (account && category) {
                const parsed = parseFloat(expenseAmount.replace(',', '.'));
                await addTransaction({
                    accountId: account.id,
                    categoryId: category.id,
                    amount: -Math.abs(parsed),
                    description: expenseDescription.trim() || `${expenseCategory.emoji} ${expenseCategory.label}`,
                    transactionDate: new Date().toISOString().split('T')[0],
                });
                analytics.expenseAdded(expenseCategory.name, amountRange(parsed));
                setSavedExpense({ amount: parsed, category: expenseCategory });
                // Pre-cargamos la categoría del primer gasto en el paso de presupuesto
                if (!budgetCategory) setBudgetCategory(expenseCategory);
            } else {
                setSavedExpense({ amount: parseFloat(expenseAmount) || 0, category: expenseCategory });
            }
            trackStepCompleted(2);
            setStep(3);
        } catch {
            setSavedExpense({ amount: parseFloat(expenseAmount) || 0, category: expenseCategory });
            setStep(3);
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Paso 3: Presupuesto ───────────────────────────────────────────────
    const handleBudgetSubmit = async (e) => {
        e.preventDefault();
        if (!budgetAmount || !budgetCategory) return;
        setSubmitting(true);
        try {
            const category = expenseCategories.find(c => c.name === budgetCategory.name);
            if (category) {
                const parsed = parseFloat(budgetAmount.replace(',', '.'));
                await addBudget({
                    categoryId: category.id,
                    amount: parsed,
                    period: 'MONTHLY',
                    startDate: new Date().toISOString().split('T')[0],
                });
                analytics.budgetAdded('onboarding', amountRange(parsed));
            }
            trackStepCompleted(3);
            setStep(4);
        } catch {
            setStep(4);
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Paso 4: Meta de ahorro ────────────────────────────────────────────
    const handleGoalSubmit = async (e) => {
        e.preventDefault();
        if (!goalName.trim() || !goalAmount) return;
        setSubmitting(true);
        try {
            const parsed = parseFloat(goalAmount.replace(',', '.'));
            await addSavingGoal({
                name: goalName.trim(),
                targetAmount: parsed,
                currentAmount: 0,
                deadline: goalDeadline || null,
            });
            analytics.savingsGoalCreated('onboarding', amountRange(parsed));
            trackStepCompleted(4);
            setStep(5);
        } catch {
            setStep(5);
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Paso 5: Recurrente ────────────────────────────────────────────────
    const handleRecurringSubmit = async (e) => {
        e.preventDefault();
        if (!recurringDescription.trim() || !recurringAmount) return;
        setSubmitting(true);
        try {
            const account = accounts[0];
            const pool = recurringType === 'INCOME' ? incomeCategories : expenseCategories;
            const category = pool.find(c => c.id === recurringCategoryId) || pool[0];

            if (account && category) {
                const parsed = parseFloat(recurringAmount.replace(',', '.'));
                const signed = recurringType === 'INCOME' ? Math.abs(parsed) : -Math.abs(parsed);
                await addRecurring({
                    accountId: account.id,
                    categoryId: category.id,
                    amount: signed,
                    description: recurringDescription.trim(),
                    frequency: recurringFrequency,
                    startDate: new Date().toISOString().split('T')[0],
                    isActive: true,
                });
                analytics.recurringCreated('onboarding', recurringType.toLowerCase(), amountRange(parsed));
            }
            trackStepCompleted(5);
            setStep(6);
        } catch {
            setStep(6);
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Paso 6: MercadoPago ───────────────────────────────────────────────
    const handleConnectMP = async () => {
        setMpRedirecting(true);
        analytics.mpConnectClicked();
        // Marcamos el onboarding como completado ANTES de redirigir.
        // Si el usuario vuelve del OAuth (success o cancel), no se queda atascado.
        try {
            await completeOnboarding();
            analytics.onboardingCompleted();
            updateUser({ onboardingCompleted: true });
        } catch {
            updateUser({ onboardingCompleted: true });
        }
        trackStepCompleted(6);

        // Guardar token como respaldo (mismo patrón que IntegrationsPage)
        try {
            const t = getToken();
            if (t) sessionStorage.setItem('mp_oauth_token_backup', t);
        } catch { /* noop */ }

        try {
            const authUrl = await getMercadoPagoAuthUrl();
            window.location.href = authUrl;
        } catch {
            // Si falla la URL, llevamos al usuario a /integrations para que reintente
            navigate('/integrations', { replace: true });
        }
    };

    const handleSkipStep = (currentStep, nextStep) => {
        trackStepSkipped(currentStep);
        setStep(nextStep);
    };

    // Refresca datos al llegar al paso final
    React.useEffect(() => {
        if (step === 7) {
            refreshData?.();
        }
    }, [step, refreshData]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center p-4">
            {/* Progress bar */}
            <div className="fixed top-0 left-0 right-0 h-1 bg-zinc-200 dark:bg-zinc-800 z-50">
                <motion.div
                    className="h-full bg-emerald-500"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4 }}
                />
            </div>

            <div className="w-full max-w-md">
                <AnimatePresence mode="wait">
                    {/* ─── Paso 1: Bienvenida ──────────────────────────── */}
                    {step === 1 && (
                        <StepWrapper key="step1">
                            <div className="text-center space-y-8">
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
                                        En los próximos 3 minutos vamos a dejar tu cuenta lista:
                                        primer gasto, presupuesto, meta de ahorro, gastos fijos y MercadoPago.
                                        Podés omitir lo que quieras.
                                    </p>
                                </div>

                                <button
                                    onClick={() => setStep(2)}
                                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-500/20 transition-all active:scale-95 group"
                                >
                                    Empezar
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </button>

                                <StepLabel step={1} />
                            </div>
                        </StepWrapper>
                    )}

                    {/* ─── Paso 2: Primer gasto ────────────────────────── */}
                    {step === 2 && (
                        <StepWrapper key="step2">
                            <form onSubmit={handleExpenseSubmit} className="space-y-6">
                                <StepHeader
                                    icon={<Sparkles className="w-6 h-6 text-emerald-500" />}
                                    iconBg="bg-emerald-500/10"
                                    title="¿En qué gastaste plata hoy?"
                                    subtitle="Ingresá el monto y elegí la categoría"
                                />

                                <AmountInput value={expenseAmount} onChange={setExpenseAmount} autoFocus required />

                                <CategoryGrid
                                    selected={expenseCategory}
                                    onSelect={setExpenseCategory}
                                />

                                <input
                                    type="text"
                                    value={expenseDescription}
                                    onChange={e => setExpenseDescription(e.target.value)}
                                    placeholder="Descripción (opcional) — ej: almuerzo en el trabajo"
                                    className="w-full px-4 py-3 text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-400"
                                />

                                <PrimaryButton
                                    disabled={!expenseAmount || !expenseCategory || submitting}
                                    submitting={submitting}
                                    label="Guardar mi primer gasto"
                                />

                                <SkipButton onClick={() => handleSkipStep(2, 3)} label="Omitir este paso" />
                                <StepLabel step={2} />
                            </form>
                        </StepWrapper>
                    )}

                    {/* ─── Paso 3: Presupuesto ─────────────────────────── */}
                    {step === 3 && (
                        <StepWrapper key="step3">
                            <form onSubmit={handleBudgetSubmit} className="space-y-6">
                                <StepHeader
                                    icon={<Target className="w-6 h-6 text-sky-500" />}
                                    iconBg="bg-sky-500/10"
                                    title="Poné un límite mensual"
                                    subtitle="¿Cuánto querés gastar por mes en una categoría?"
                                />

                                <AmountInput value={budgetAmount} onChange={setBudgetAmount} autoFocus />

                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">Categoría</p>
                                    <CategoryGrid
                                        selected={budgetCategory}
                                        onSelect={setBudgetCategory}
                                    />
                                </div>

                                <PrimaryButton
                                    disabled={!budgetAmount || !budgetCategory || submitting}
                                    submitting={submitting}
                                    label="Crear presupuesto"
                                />

                                <SkipButton onClick={() => handleSkipStep(3, 4)} label="Omitir por ahora" />
                                <StepLabel step={3} />
                            </form>
                        </StepWrapper>
                    )}

                    {/* ─── Paso 4: Meta de ahorro ──────────────────────── */}
                    {step === 4 && (
                        <StepWrapper key="step4">
                            <form onSubmit={handleGoalSubmit} className="space-y-6">
                                <StepHeader
                                    icon={<PiggyBank className="w-6 h-6 text-amber-500" />}
                                    iconBg="bg-amber-500/10"
                                    title="¿Estás ahorrando para algo?"
                                    subtitle="Una meta concreta es 2x más fácil de lograr"
                                />

                                <input
                                    type="text"
                                    value={goalName}
                                    onChange={e => setGoalName(e.target.value)}
                                    placeholder="Ej: Vacaciones, notebook, viaje a Europa..."
                                    autoFocus
                                    className="w-full px-4 py-4 text-base font-bold text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-400 placeholder:font-medium"
                                />

                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Monto objetivo</p>
                                    <AmountInput value={goalAmount} onChange={setGoalAmount} accent="amber" />
                                </div>

                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Fecha límite (opcional)</p>
                                    <input
                                        type="date"
                                        value={goalDeadline}
                                        onChange={e => setGoalDeadline(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-4 py-3 text-sm font-bold text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
                                    />
                                </div>

                                <PrimaryButton
                                    disabled={!goalName.trim() || !goalAmount || submitting}
                                    submitting={submitting}
                                    label="Crear meta de ahorro"
                                    color="amber"
                                />

                                <SkipButton onClick={() => handleSkipStep(4, 5)} label="Omitir por ahora" />
                                <StepLabel step={4} />
                            </form>
                        </StepWrapper>
                    )}

                    {/* ─── Paso 5: Recurrente ──────────────────────────── */}
                    {step === 5 && (
                        <StepWrapper key="step5">
                            <form onSubmit={handleRecurringSubmit} className="space-y-6">
                                <StepHeader
                                    icon={<Repeat className="w-6 h-6 text-violet-500" />}
                                    iconBg="bg-violet-500/10"
                                    title="Cargá un ingreso o gasto fijo"
                                    subtitle="Sueldo, alquiler, suscripciones... lo que se repite cada mes"
                                />

                                {/* Tipo: ingreso / gasto */}
                                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
                                    {[
                                        { value: 'INCOME', label: '💰 Ingreso' },
                                        { value: 'EXPENSE', label: '💸 Gasto' },
                                    ].map(t => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => {
                                                setRecurringType(t.value);
                                                setRecurringCategoryId(null);
                                            }}
                                            className={`py-2.5 rounded-xl font-bold text-sm transition-all ${
                                                recurringType === t.value
                                                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                                                    : 'text-zinc-500 dark:text-zinc-400'
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>

                                <input
                                    type="text"
                                    value={recurringDescription}
                                    onChange={e => setRecurringDescription(e.target.value)}
                                    placeholder={recurringType === 'INCOME' ? 'Ej: Sueldo, freelance...' : 'Ej: Alquiler, Netflix, gimnasio...'}
                                    autoFocus
                                    className="w-full px-4 py-3.5 text-base font-bold text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:border-violet-500 transition-colors placeholder:text-zinc-400 placeholder:font-medium"
                                />

                                <AmountInput value={recurringAmount} onChange={setRecurringAmount} accent="violet" />

                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Frecuencia</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {FREQUENCIES.map(f => (
                                            <button
                                                key={f.value}
                                                type="button"
                                                onClick={() => setRecurringFrequency(f.value)}
                                                className={`py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                                                    recurringFrequency === f.value
                                                        ? 'bg-violet-500 text-white'
                                                        : 'bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                                                }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <PrimaryButton
                                    disabled={!recurringDescription.trim() || !recurringAmount || submitting}
                                    submitting={submitting}
                                    label="Guardar recurrente"
                                    color="violet"
                                />

                                <SkipButton onClick={() => handleSkipStep(5, 6)} label="Omitir por ahora" />
                                <StepLabel step={5} />
                            </form>
                        </StepWrapper>
                    )}

                    {/* ─── Paso 6: MercadoPago ─────────────────────────── */}
                    {step === 6 && (
                        <StepWrapper key="step6">
                            <div className="space-y-6">
                                <StepHeader
                                    icon={<CreditCard className="w-6 h-6 text-[#00AAFF]" />}
                                    iconBg="bg-[#00AAFF]/10"
                                    title="Conectá tu MercadoPago"
                                    subtitle="Importá automáticamente tus últimos 90 días de movimientos"
                                />

                                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 space-y-2.5">
                                    {[
                                        'Tus cobros y pagos al instante en el dashboard',
                                        'Categorización automática',
                                        'Sincronización on-demand cuando quieras',
                                    ].map((feature, i) => (
                                        <div key={i} className="flex items-center gap-2.5 text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                                            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                            {feature}
                                        </div>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={handleConnectMP}
                                    disabled={mpRedirecting}
                                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#00AAFF] hover:bg-[#0099EE] disabled:opacity-60 text-white rounded-2xl font-black text-sm shadow-xl shadow-[#00AAFF]/20 transition-all active:scale-95 group"
                                >
                                    {mpRedirecting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <CreditCard className="w-5 h-5" />
                                    )}
                                    {mpRedirecting ? 'Redirigiendo...' : 'Conectar Mercado Pago'}
                                    {!mpRedirecting && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
                                </button>

                                <SkipButton
                                    onClick={() => {
                                        trackStepSkipped(6);
                                        setStep(7);
                                    }}
                                    label="Conectar después"
                                />
                                <StepLabel step={6} />
                            </div>
                        </StepWrapper>
                    )}

                    {/* ─── Paso 7: Done ─────────────────────────────────── */}
                    {step === 7 && (
                        <StepWrapper key="step7" variant="scale">
                            <div className="text-center space-y-8">
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
                                        ¡Cuenta lista, {firstName}!
                                    </h2>
                                    <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                                        Tu asistente financiero está listo para usar.
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
                                    onClick={() => finishOnboarding()}
                                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-zinc-900 dark:bg-white hover:bg-zinc-700 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-black text-sm transition-all active:scale-95 group"
                                >
                                    Ir al dashboard
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </button>
                            </div>
                        </StepWrapper>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ─── Subcomponentes ─────────────────────────────────────────────────────────

function StepWrapper({ children, variant = 'slide' }) {
    const props = variant === 'scale'
        ? { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 } }
        : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -24 } };
    return (
        <motion.div {...props} transition={{ duration: 0.3 }}>
            {children}
        </motion.div>
    );
}

function StepHeader({ icon, iconBg, title, subtitle }) {
    return (
        <div className="text-center space-y-3">
            <div className={`w-14 h-14 ${iconBg} rounded-2xl flex items-center justify-center mx-auto`}>
                {icon}
            </div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                {title}
            </h2>
            <p className="text-zinc-400 text-sm">{subtitle}</p>
        </div>
    );
}

function AmountInput({ value, onChange, autoFocus, required, accent = 'emerald' }) {
    const focusClass = {
        emerald: 'focus:border-emerald-500',
        amber: 'focus:border-amber-500',
        violet: 'focus:border-violet-500',
        sky: 'focus:border-sky-500',
    }[accent];

    return (
        <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-black text-xl">$</span>
            <input
                type="number"
                inputMode="decimal"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="0"
                min="0"
                step="any"
                required={required}
                autoFocus={autoFocus}
                className={`w-full pl-10 pr-4 py-4 text-2xl font-black text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl focus:outline-none ${focusClass} transition-colors`}
                style={{ fontSize: '1.5rem' }}
            />
        </div>
    );
}

function CategoryGrid({ selected, onSelect }) {
    return (
        <div className="grid grid-cols-4 gap-2">
            {CATEGORY_BUTTONS.map(cat => (
                <button
                    key={cat.name}
                    type="button"
                    onClick={() => onSelect(cat)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all active:scale-95 ${
                        selected?.name === cat.name
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-800'
                    }`}
                >
                    <span className="text-xl">{cat.emoji}</span>
                    <span className={`text-[10px] font-bold ${
                        selected?.name === cat.name
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-zinc-500 dark:text-zinc-400'
                    }`}>{cat.label}</span>
                </button>
            ))}
        </div>
    );
}

function PrimaryButton({ disabled, submitting, label, color = 'emerald' }) {
    const colors = {
        emerald: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20',
        amber: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
        violet: 'bg-violet-500 hover:bg-violet-600 shadow-violet-500/20',
    };
    return (
        <button
            type="submit"
            disabled={disabled}
            className={`w-full flex items-center justify-center gap-3 px-6 py-4 ${colors[color]} disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95`}
        >
            {submitting ? 'Guardando...' : label}
            {!submitting && <ArrowRight className="w-4 h-4" />}
        </button>
    );
}

function SkipButton({ onClick, label = 'Omitir' }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-bold text-sm transition-colors"
        >
            <SkipForward className="w-3.5 h-3.5" />
            {label}
        </button>
    );
}

function StepLabel({ step }) {
    if (step === 1) return <p className="text-xs text-zinc-400">Configuración inicial</p>;
    if (step >= 2 && step <= 6) {
        return <p className="text-center text-xs text-zinc-400">Paso {step - 1} de {TOTAL_ACTION_STEPS}</p>;
    }
    return null;
}
