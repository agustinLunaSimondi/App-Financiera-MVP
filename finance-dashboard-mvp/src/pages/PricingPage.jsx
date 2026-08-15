import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, X, Sparkles, ArrowLeft, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { analytics } from '../services/analytics';
import { recordPricingIntent } from '../services/api';

/**
 * Pricing page — instrumento de validación de precio, no checkout.
 *
 * En esta etapa NO cobramos: el objetivo es medir willingness-to-pay antes de
 * construir la infraestructura de cobro. Cada interacción se registra como
 * `pricing_intent` para poder leer la conversión por precio mostrado.
 *
 * El precio se ancla en USD y se muestra en ARS al valor del día. Esa decisión
 * es parte del producto: una suscripción que no se licúa con la inflación es
 * coherente con lo que la app le promete al usuario sobre su propia plata.
 */

// Precio del experimento actual. Cambiarlo acá cambia lo que se muestra Y lo que
// se registra en pricing_intents, así se puede segmentar la conversión por precio.
const PRICE_USD = 6;
const PRICE_ARS = 7200;
const VARIANT = 'v1-usd6';

const FREE_FEATURES = [
    { label: 'Dashboard completo', included: true },
    { label: 'MercadoPago auto-sync', included: true },
    { label: 'Presupuestos con alerta al 80%', included: true },
    { label: 'Transacciones recurrentes', included: true },
    { label: 'Metas de ahorro', included: true },
    { label: 'Rachas y logros', included: true },
    { label: 'Chat AI (20 mensajes/mes)', included: true },
    { label: 'AI Insights', included: false },
    { label: 'Reportes avanzados y export impositivo', included: false },
];

const PREMIUM_FEATURES = [
    'Todo lo del plan Gratis',
    'AI Insights: análisis de tus patrones con recomendaciones concretas',
    'Chat AI ilimitado',
    'Reportes avanzados + export para tu contador',
    'Panel de inflación extendido con proyecciones',
    'Soporte prioritario',
];

export function PricingPage() {
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    // Evita registrar la vista dos veces con el StrictMode de dev.
    const viewTracked = useRef(false);

    useEffect(() => {
        if (viewTracked.current) return;
        viewTracked.current = true;
        analytics.pricingViewed({ priceArs: PRICE_ARS, priceUsd: PRICE_USD, variant: VARIANT });
        recordPricingIntent({
            action: 'viewed_pricing',
            priceShownArs: PRICE_ARS,
            priceShownUsd: PRICE_USD,
        });
    }, []);

    const handleSubscribeClick = async () => {
        analytics.pricingSubscribeClicked({ priceArs: PRICE_ARS, priceUsd: PRICE_USD, variant: VARIANT });
        await recordPricingIntent({
            action: 'clicked_subscribe',
            priceShownArs: PRICE_ARS,
            priceShownUsd: PRICE_USD,
            email: email || undefined,
        });
        setSubmitted(true);
        toast.success('¡Anotado! Te avisamos apenas Premium esté disponible.');
    };

    const handleRejectSubmit = async (e) => {
        e.preventDefault();
        analytics.pricingRejected({
            priceArs: PRICE_ARS,
            priceUsd: PRICE_USD,
            hasFeedback: Boolean(feedback.trim()),
        });
        await recordPricingIntent({
            action: 'rejected_price',
            priceShownArs: PRICE_ARS,
            priceShownUsd: PRICE_USD,
            email: email || undefined,
            feedback: feedback.trim() || undefined,
        });
        setFeedbackOpen(false);
        setFeedback('');
        toast.success('Gracias — esto nos sirve muchísimo.');
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white">
            <div className="max-w-5xl mx-auto px-5 py-10 sm:py-16">

                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors mb-10"
                >
                    <ArrowLeft size={16} />
                    Volver
                </Link>

                {/* ───── Encabezado ───── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-5">
                        <Sparkles size={13} className="text-emerald-600 dark:text-emerald-400" />
                        <span className="text-[11px] font-black uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-400">
                            En construcción
                        </span>
                    </div>

                    <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] mb-5">
                        Vueltito es gratis.<br />
                        <span className="text-emerald-600 dark:text-emerald-400">Y va a seguir siéndolo.</span>
                    </h1>

                    <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
                        Estamos armando un plan Premium con las funciones que más nos piden.
                        Todavía no lo lanzamos — queremos saber qué te parece el precio antes de construirlo.
                    </p>
                </motion.div>

                {/* ───── Planes ───── */}
                <div className="grid md:grid-cols-2 gap-5 mb-12">

                    {/* Gratis */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.05 }}
                        className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 backdrop-blur p-7"
                    >
                        <h2 className="text-xl font-black mb-1">Gratis</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">Todo lo que necesitás para ordenarte.</p>

                        <div className="flex items-baseline gap-1 mb-7">
                            <span className="text-4xl font-black tracking-tight">$0</span>
                            <span className="text-sm font-bold text-zinc-500">/ para siempre</span>
                        </div>

                        <ul className="space-y-3">
                            {FREE_FEATURES.map((f) => (
                                <li key={f.label} className="flex items-start gap-2.5 text-sm">
                                    {f.included ? (
                                        <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                    ) : (
                                        <X size={16} className="text-zinc-300 dark:text-zinc-700 shrink-0 mt-0.5" />
                                    )}
                                    <span className={f.included ? 'font-medium' : 'text-zinc-400 dark:text-zinc-600'}>
                                        {f.label}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Premium */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.12 }}
                        className="relative rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-500/[0.07] to-transparent dark:from-emerald-500/10 p-7 shadow-xl shadow-emerald-500/5"
                    >
                        <div className="absolute -top-3 left-7 px-3 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-[0.15em]">
                            Próximamente
                        </div>

                        <h2 className="text-xl font-black mb-1">Premium</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">Para los que quieren exprimir cada peso.</p>

                        <div className="flex items-baseline gap-1.5 mb-1">
                            <span className="text-4xl font-black tracking-tight">USD {PRICE_USD}</span>
                            <span className="text-sm font-bold text-zinc-500">/ mes</span>
                        </div>
                        <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2">
                            ≈ ${PRICE_ARS.toLocaleString('es-AR')} ARS al blue de hoy
                        </p>
                        <div className="flex items-start gap-2 mb-7 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
                            <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                El precio está anclado al dólar, no a un monto fijo en pesos.
                                Tu suscripción no se licúa — igual que queremos que pase con tu plata.
                            </p>
                        </div>

                        <ul className="space-y-3 mb-7">
                            {PREMIUM_FEATURES.map((f) => (
                                <li key={f} className="flex items-start gap-2.5 text-sm">
                                    <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <span className="font-medium">{f}</span>
                                </li>
                            ))}
                        </ul>

                        {submitted ? (
                            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-4 text-center">
                                <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                                    ¡Listo! Estás en la lista.
                                </p>
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                                    Te avisamos apenas Premium esté disponible.
                                </p>
                            </div>
                        ) : (
                            <>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tu@email.com (opcional)"
                                    aria-label="Email para avisarte cuando Premium esté disponible"
                                    className="w-full px-4 py-3 mb-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-base outline-none focus:border-emerald-500 transition-colors"
                                />
                                <button
                                    onClick={handleSubscribeClick}
                                    className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black transition-colors"
                                >
                                    Me interesa a este precio
                                </button>
                            </>
                        )}
                    </motion.div>
                </div>

                {/* ───── Señal negativa: la más valiosa ───── */}
                <div className="text-center">
                    {!feedbackOpen ? (
                        <button
                            onClick={() => setFeedbackOpen(true)}
                            className="text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white underline underline-offset-4 transition-colors"
                        >
                            Me parece caro / no lo pagaría
                        </button>
                    ) : (
                        <motion.form
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            onSubmit={handleRejectSubmit}
                            className="max-w-md mx-auto rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 text-left"
                        >
                            <label htmlFor="pricing-feedback" className="text-sm font-black block mb-2">
                                ¿Qué precio te parecería justo, o qué le falta?
                            </label>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                                Esto es lo que más nos sirve para no construir algo que nadie quiere.
                            </p>
                            <textarea
                                id="pricing-feedback"
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                rows={3}
                                maxLength={1000}
                                placeholder="Lo pagaría si… / Me parece caro porque…"
                                className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-base outline-none focus:border-emerald-500 transition-colors resize-none"
                            />
                            <div className="flex gap-2 mt-3">
                                <button
                                    type="submit"
                                    className="flex-1 py-3 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black text-sm transition-opacity hover:opacity-90"
                                >
                                    Enviar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFeedbackOpen(false)}
                                    className="px-5 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 font-bold text-sm text-zinc-500"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </motion.form>
                    )}
                </div>

            </div>
        </div>
    );
}

export default PricingPage;
