import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import {
    ArrowRight, Check, Sparkles, Zap, Brain, Mic, PieChart,
    CreditCard, Bell, Lock, TrendingUp, TrendingDown, Wallet,
    Github, Twitter, Star, ArrowUpRight, ArrowDownRight, Shield,
    BarChart3, Bot, MessageSquare,
} from 'lucide-react';
import { joinWaitlist, getWaitlistCount } from '../services/api';
import { analytics } from '../services/analytics';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Nav() {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header className={`fixed top-8 left-0 right-0 z-50 transition-all duration-300 ${
            scrolled
                ? 'backdrop-blur-xl bg-white/70 dark:bg-zinc-950/70 border-b border-zinc-200/60 dark:border-zinc-800/60'
                : 'bg-transparent'
        }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
                        Vuelto
                    </span>
                </Link>

                <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-zinc-600 dark:text-zinc-400">
                    <a href="#features" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Features</a>
                    <a href="#how" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Cómo funciona</a>
                    <a href="#about" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Sobre el proyecto</a>
                </nav>

                <div className="flex items-center gap-2">
                    <Link
                        to="/login"
                        className="hidden sm:inline-flex text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-3 py-2 transition-colors"
                        onClick={() => analytics.landingCtaClicked('nav_login')}
                    >
                        Iniciar sesión
                    </Link>
                    <Link
                        to="/register"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-black rounded-xl hover:bg-zinc-700 dark:hover:bg-zinc-100 transition-colors active:scale-95"
                        onClick={() => analytics.landingCtaClicked('nav_register')}
                    >
                        Probar gratis
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>
        </header>
    );
}

function WaitlistForm({ source = 'hero', cta = 'Sumate a la beta', large = false }) {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle | loading | success | error
    const [message, setMessage] = useState('');

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!email || status === 'loading') return;
        setStatus('loading');
        try {
            const res = await joinWaitlist(email, source);
            analytics.waitlistSignup(source);
            setStatus('success');
            setMessage(res.message || '¡Listo! Te avisamos pronto.');
            setEmail('');
        } catch (err) {
            setStatus('error');
            setMessage(err.response?.data?.detail || 'Algo falló. Reintentá en un momento.');
        }
    };

    return (
        <form onSubmit={onSubmit} className={`w-full ${large ? 'max-w-lg' : 'max-w-md'}`}>
            <div className={`flex flex-col sm:flex-row gap-2 p-1.5 ${large ? 'sm:p-2' : ''} bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl shadow-zinc-900/5`}>
                <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    disabled={status === 'loading' || status === 'success'}
                    className={`flex-1 px-4 ${large ? 'py-3.5 text-base' : 'py-3 text-sm'} bg-transparent outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400 font-medium disabled:opacity-60`}
                />
                <button
                    type="submit"
                    disabled={status === 'loading' || status === 'success'}
                    className={`flex items-center justify-center gap-2 ${large ? 'px-6 py-3.5 text-base' : 'px-5 py-3 text-sm'} bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-black rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 whitespace-nowrap`}
                >
                    {status === 'loading' ? 'Sumando...' : status === 'success' ? <><Check className="w-4 h-4" />¡Sumado!</> : <>{cta}<ArrowRight className="w-4 h-4" /></>}
                </button>
            </div>

            <AnimatePresence>
                {message && (
                    <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`mt-3 text-sm font-bold text-center ${
                            status === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                    >
                        {message}
                    </motion.p>
                )}
            </AnimatePresence>
        </form>
    );
}

function DashboardMockup() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl mx-auto"
        >
            {/* Glow */}
            <div className="absolute -inset-8 bg-gradient-to-tr from-emerald-500/20 via-sky-500/10 to-purple-500/20 blur-3xl rounded-full pointer-events-none" />

            {/* Main dashboard card */}
            <div className="relative bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl shadow-zinc-900/20 dark:shadow-black/40 overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-400" />
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-xs font-bold text-zinc-400">vuelto.app/dashboard</span>
                    <div className="w-12" />
                </div>

                <div className="p-5 sm:p-7 space-y-5">
                    {/* Top row: Balance + Income/Expenses */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="sm:col-span-1 p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20"
                        >
                            <div className="flex items-center gap-1.5 mb-1">
                                <Wallet className="w-3 h-3 text-emerald-500" />
                                <p className="text-[9px] uppercase font-black tracking-widest text-zinc-500">Balance</p>
                            </div>
                            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">$487.230</p>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.75 }}
                            className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700"
                        >
                            <div className="flex items-center gap-1.5 mb-1">
                                <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                                <p className="text-[9px] uppercase font-black tracking-widest text-zinc-500">Ingresos</p>
                            </div>
                            <p className="text-base font-black text-zinc-900 dark:text-white">$890k</p>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.9 }}
                            className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700"
                        >
                            <div className="flex items-center gap-1.5 mb-1">
                                <ArrowDownRight className="w-3 h-3 text-rose-500" />
                                <p className="text-[9px] uppercase font-black tracking-widest text-zinc-500">Egresos</p>
                            </div>
                            <p className="text-base font-black text-zinc-900 dark:text-white">$403k</p>
                        </motion.div>
                    </div>

                    {/* AI Insight card */}
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.05 }}
                        className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-sky-500/10 to-emerald-500/10 border border-purple-500/20 flex items-start gap-3"
                    >
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-sky-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] uppercase font-black tracking-widest text-purple-600 dark:text-purple-400 mb-1">AI · Esta semana</p>
                            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200 leading-relaxed">
                                Gastaste 38% más en delivery que la semana pasada. Si cocinás 2 veces más, ahorrás ~$24k al mes.
                            </p>
                        </div>
                    </motion.div>

                    {/* Transaction feed (animated) */}
                    <div className="space-y-2">
                        {[
                            { emoji: '🍔', desc: 'PEDIDOSYA', cat: 'Comida', amount: '-$8.450', tone: 'rose', delay: 1.2 },
                            { emoji: '💰', desc: 'Cobro Mercado Pago', cat: 'Trabajo', amount: '+$125.000', tone: 'emerald', delay: 1.35 },
                            { emoji: '🚗', desc: 'YPF · Estación 14', cat: 'Transporte', amount: '-$15.200', tone: 'rose', delay: 1.5 },
                        ].map((tx, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: tx.delay }}
                                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center text-base shadow-sm">
                                    {tx.emoji}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{tx.desc}</p>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{tx.cat}</p>
                                </div>
                                <span className={`text-sm font-black ${tx.tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {tx.amount}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Floating mini-cards */}
            <motion.div
                initial={{ opacity: 0, x: -30, y: 20 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 1.7, duration: 0.5 }}
                className="hidden lg:flex absolute -left-12 top-1/2 -translate-y-1/2 items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl"
            >
                <div className="w-7 h-7 rounded-lg bg-[#00AAFF]/10 flex items-center justify-center">
                    <CreditCard className="w-3.5 h-3.5 text-[#00AAFF]" />
                </div>
                <div>
                    <p className="text-[9px] uppercase font-black tracking-widest text-zinc-400">MP Sync</p>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">12 nuevas</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: 30, y: -20 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 1.85, duration: 0.5 }}
                className="hidden lg:flex absolute -right-8 -top-4 items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl"
            >
                <Bell className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-xs font-bold text-zinc-900 dark:text-white">85% del budget</p>
            </motion.div>
        </motion.div>
    );
}

function Section({ children, className = '' }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '-100px' });
    return (
        <motion.section
            ref={ref}
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className={className}
        >
            {children}
        </motion.section>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// LANDING PAGE
// ─────────────────────────────────────────────────────────────────────────────

export function LandingPage() {
    const [waitlistCount, setWaitlistCount] = useState(null);
    const { scrollYProgress } = useScroll();
    const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -60]);

    useEffect(() => {
        analytics.landingViewed();
        getWaitlistCount()
            .then(d => setWaitlistCount(d.count))
            .catch(() => setWaitlistCount(null));
    }, []);

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white selection:bg-emerald-500/20 selection:text-emerald-700 overflow-x-hidden">
            {/* ───── BETA BANNER (fixed top, always visible) ───── */}
            <div className="fixed top-0 left-0 right-0 h-8 bg-amber-500 text-zinc-900 text-center text-xs sm:text-sm font-bold flex items-center justify-center px-4 z-[60]">
                <span className="inline-flex items-center gap-2 flex-wrap justify-center">
                    <span className="inline-block w-2 h-2 rounded-full bg-zinc-900 animate-pulse" />
                    Vuelto está en <strong>beta privada gratuita</strong> · No es un servicio financiero ni mueve plata ·{' '}
                    <Link to="/terms" className="underline underline-offset-2 hover:opacity-70">Términos</Link>
                </span>
            </div>

            <Nav />

            {/* ───── HERO ───── */}
            <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-32 overflow-hidden">
                {/* Animated background */}
                <div className="absolute inset-0 -z-10">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[600px] bg-gradient-radial from-emerald-500/20 via-emerald-500/5 to-transparent blur-3xl" />
                    <div className="absolute top-40 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
                    <div className="absolute top-60 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
                    {/* Dot grid */}
                    <div
                        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08]"
                        style={{
                            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                            backgroundSize: '24px 24px',
                        }}
                    />
                </div>

                <motion.div style={{ y: heroY }} className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Eyebrow pill */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-6"
                        >
                            <span className="text-base">🇦🇷</span>
                            <span className="text-xs font-black tracking-wider text-zinc-700 dark:text-zinc-300">
                                HECHO EN ARGENTINA · POTENCIADO CON IA
                            </span>
                        </motion.div>

                        {/* Headline */}
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                            className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] mb-6"
                        >
                            Tu plata.
                            <br />
                            <span className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-sky-500 bg-clip-text text-transparent">
                                Sin Excel.
                            </span>
                            <br />
                            Sin vueltas.
                        </motion.h1>

                        {/* Subheadline */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35, duration: 0.6 }}
                            className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed font-medium"
                        >
                            Conectá tu Mercado Pago, mirá adónde se va tu sueldo en tiempo real,
                            y dejá que la IA te diga cómo gastar mejor.
                        </motion.p>

                        {/* CTA Form */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.6 }}
                            className="flex flex-col items-center gap-4"
                        >
                            <WaitlistForm source="hero" cta="Sumate a la beta" large />

                            <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                                <span>o</span>
                                <Link
                                    to="/register"
                                    onClick={() => analytics.landingCtaClicked('hero_register')}
                                    className="font-bold text-zinc-900 dark:text-white hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
                                >
                                    probar ahora con un click <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </motion.div>

                        {/* Trust signals */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            className="mt-10 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs font-bold text-zinc-500 dark:text-zinc-400"
                        >
                            <span className="flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5" />
                                Solo lectura · tu plata no se toca
                            </span>
                            <span className="hidden sm:inline">·</span>
                            <span className="flex items-center gap-1.5">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                {waitlistCount !== null && waitlistCount > 0
                                    ? `+${waitlistCount} argentinos esperando`
                                    : 'Beta privada · pre-registro abierto'}
                            </span>
                            <span className="hidden sm:inline">·</span>
                            <span className="flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5" />
                                Setup en 30 segundos
                            </span>
                        </motion.div>
                    </div>

                    {/* Dashboard mockup */}
                    <div className="mt-20 sm:mt-28">
                        <DashboardMockup />
                    </div>
                </motion.div>
            </section>

            {/* ───── STATS STRIP ───── */}
            <Section className="border-y border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { value: '$0', label: 'Para empezar' },
                            { value: '30s', label: 'Setup completo' },
                            { value: '90 días', label: 'De historial al conectar MP' },
                            { value: 'IA', label: 'En español argentino' },
                        ].map((stat, i) => (
                            <div key={i} className="text-center">
                                <p className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-br from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
                                    {stat.value}
                                </p>
                                <p className="mt-1 text-xs font-bold text-zinc-500 uppercase tracking-wider">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </Section>

            {/* ───── PROBLEM ───── */}
            <Section className="py-24 sm:py-32">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <p className="text-xs font-black uppercase tracking-widest text-rose-500 mb-3">El problema</p>
                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                            Llegás a fin de mes y no sabés <br className="hidden sm:block" />
                            <span className="text-rose-500">en qué se te fue todo</span>.
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                emoji: '🤷‍♂️',
                                title: '"¿En qué gasté tanto?"',
                                body: 'Cobrás el sueldo y a los 20 días no queda nada. Sin tracking, fin de mes es siempre sorpresa.',
                            },
                            {
                                emoji: '🌎',
                                title: 'Apps gringas que no te entienden',
                                body: '5% de inflación mensual y sus "tips" siguen siendo cobrar en dólares y poner plata en un index fund.',
                            },
                            {
                                emoji: '📊',
                                title: 'El Excel ya no aguanta',
                                body: 'Lo abrís entusiasmado 2 veces, después nunca más. La fricción te gana.',
                            },
                        ].map((card, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                            >
                                <div className="text-4xl mb-4">{card.emoji}</div>
                                <h3 className="text-lg font-black mb-2 text-zinc-900 dark:text-white">{card.title}</h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{card.body}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </Section>

            {/* ───── SOLUTION HERO (MP) ───── */}
            <Section className="py-24 sm:py-32 relative overflow-hidden">
                <div className="absolute inset-0 -z-10">
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-emerald-500/5" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-[#00AAFF] mb-3">El diferencial</p>
                            <h2 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] mb-6">
                                Conectá tu MP.
                                <br />
                                <span className="bg-gradient-to-r from-[#00AAFF] to-emerald-500 bg-clip-text text-transparent">
                                    Listo.
                                </span>
                            </h2>
                            <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed mb-8 font-medium">
                                Importamos automáticamente todos tus cobros y pagos de Mercado Pago.
                                Categorizamos cada operación. Y aprendemos cómo gastás para ayudarte a gastar mejor.
                            </p>

                            <ul className="space-y-4 mb-8">
                                {[
                                    'Importación automática de los últimos 90 días',
                                    'Sincronización cada 24 horas, sin tocar un botón',
                                    'Solo lectura — la app no puede mover plata',
                                    'Deduplicación inteligente, cero registros duplicados',
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
                                        </div>
                                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link
                                to="/register"
                                onClick={() => analytics.landingCtaClicked('solution_register')}
                                className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#00AAFF] hover:bg-[#0099EE] text-white font-black rounded-2xl shadow-xl shadow-[#00AAFF]/30 transition-all active:scale-95 group"
                            >
                                Conectar mi MP
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>

                        {/* Visual: MP connection animation */}
                        <div className="relative">
                            <div className="aspect-square max-w-md mx-auto relative">
                                {/* Glow */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-[#00AAFF]/30 to-emerald-500/30 blur-3xl rounded-full" />

                                {/* MP card */}
                                <motion.div
                                    initial={{ opacity: 0, x: -40 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6 }}
                                    className="absolute top-8 left-4 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-2xl"
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-[#00AAFF] flex items-center justify-center">
                                            <CreditCard className="w-4 h-4 text-white" />
                                        </div>
                                        <span className="text-sm font-black text-zinc-900 dark:text-white">Mercado Pago</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs"><span className="text-zinc-500">Cobro</span><span className="font-bold text-emerald-500">+$25.000</span></div>
                                        <div className="flex justify-between text-xs"><span className="text-zinc-500">PedidosYa</span><span className="font-bold text-rose-500">-$3.450</span></div>
                                        <div className="flex justify-between text-xs"><span className="text-zinc-500">Uber</span><span className="font-bold text-rose-500">-$2.100</span></div>
                                    </div>
                                </motion.div>

                                {/* Arrow / flow */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.3 }}
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00AAFF] to-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/40"
                                >
                                    <ArrowRight className="w-6 h-6 text-white" />
                                </motion.div>

                                {/* Vuelto card */}
                                <motion.div
                                    initial={{ opacity: 0, x: 40 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: 0.2 }}
                                    className="absolute bottom-8 right-4 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-2xl"
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                                            <Wallet className="w-4 h-4 text-white" />
                                        </div>
                                        <span className="text-sm font-black text-zinc-900 dark:text-white">Vuelto</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 text-xs"><span>🍔</span><span className="text-zinc-500 flex-1">Comida</span><span className="font-bold">-$3.450</span></div>
                                        <div className="flex items-center gap-2 text-xs"><span>🚗</span><span className="text-zinc-500 flex-1">Transporte</span><span className="font-bold">-$2.100</span></div>
                                        <div className="flex items-center gap-2 text-xs"><span>💰</span><span className="text-zinc-500 flex-1">Trabajo</span><span className="font-bold text-emerald-500">+$25k</span></div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* ───── FEATURES ───── */}
            <Section className="py-24 sm:py-32">
                <div id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <p className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-3">Features</p>
                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                            Todo lo que necesitás. <br className="hidden sm:block" />
                            <span className="text-zinc-400 dark:text-zinc-500">Nada que no.</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[
                            { icon: CreditCard, color: '#00AAFF', title: 'MP auto-sync', body: 'Importación automática cada 24h. Cobros, pagos, transferencias.' },
                            { icon: Bot, color: '#a855f7', title: 'AI Insights semanales', body: 'Cada lunes te llega un análisis con 3 acciones concretas para ahorrar.' },
                            { icon: Mic, color: '#ec4899', title: 'Carga por voz', body: '"Gasté 800 en el almuerzo" → guardado. En español rioplatense.', soon: true },
                            { icon: PieChart, color: '#10b981', title: 'Presupuestos vivos', body: 'Te avisamos al 80% del límite. Antes de que sea tarde.' },
                            { icon: BarChart3, color: '#f59e0b', title: 'Categorización con IA', body: '"PEDIDOSYA*123" se categoriza como Comida sin que toques nada.' },
                            { icon: Lock, color: '#3b82f6', title: 'Tu plata, segura', body: 'OAuth real, solo lectura. Nunca pedimos contraseñas.' },
                        ].map((f, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.05 }}
                                className="group relative p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all hover:shadow-2xl hover:shadow-zinc-900/5 dark:hover:shadow-black/40 hover:-translate-y-1"
                            >
                                {f.soon && (
                                    <span className="absolute top-4 right-4 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                        Pronto
                                    </span>
                                )}
                                <div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-lg"
                                    style={{ backgroundColor: `${f.color}15`, boxShadow: `0 8px 24px ${f.color}20` }}
                                >
                                    <f.icon className="w-6 h-6" style={{ color: f.color }} />
                                </div>
                                <h3 className="font-black text-lg text-zinc-900 dark:text-white mb-2">{f.title}</h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{f.body}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </Section>

            {/* ───── HOW IT WORKS ───── */}
            <Section className="py-24 sm:py-32 bg-zinc-50 dark:bg-zinc-900/30">
                <div id="how" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <p className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-3">Cómo funciona</p>
                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                            3 pasos. <span className="text-zinc-400 dark:text-zinc-500">Y listo.</span>
                        </h2>
                    </div>

                    <div className="space-y-4 sm:space-y-6">
                        {[
                            { n: '01', title: 'Te registrás', body: 'Email + contraseña, o Google. 30 segundos.', emoji: '🚀' },
                            { n: '02', title: 'Conectás tu MP', body: 'Un click. OAuth oficial. Nunca pedimos tu contraseña de MP.', emoji: '🔗' },
                            { n: '03', title: 'La app hace el resto', body: 'Importa, categoriza, analiza. Cada semana te llegan insights con IA.', emoji: '🤖' },
                        ].map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-center gap-4 sm:gap-6 p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                            >
                                <div className="text-3xl sm:text-5xl font-black text-zinc-200 dark:text-zinc-800 shrink-0 tabular-nums">
                                    {step.n}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg sm:text-2xl font-black text-zinc-900 dark:text-white mb-1">
                                        {step.title}
                                    </h3>
                                    <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 font-medium">{step.body}</p>
                                </div>
                                <div className="text-3xl sm:text-5xl shrink-0">{step.emoji}</div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </Section>

            {/* ───── SOBRE EL PROYECTO ───── */}
            <Section className="py-24 sm:py-32">
                <div id="about" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <p className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-3">Sobre el proyecto</p>
                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                            Por qué existe Vuelto
                        </h2>
                    </div>

                    <div className="space-y-6 text-base sm:text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        <p>
                            Soy Agustín, vivo en Argentina y me cansé de terminar el mes preguntándome a
                            dónde se fue la plata. Probé el clásico Excel, lo abandoné en menos de una
                            semana. Bajé tres apps de finanzas — todas pagas, todas en inglés o español
                            neutro, ninguna entendía que en este país el 80% de mis gastos pasan por
                            Mercado Pago.
                        </p>
                        <p>
                            Las apps grandes te piden cargar todo a mano. Las locales son tu banco mostrándote
                            tu banco — ningún agregador. Y nadie te dice cuánto estás gastando en dólar blue
                            o cómo te está pegando la inflación de este mes en serio.
                        </p>
                        <p>
                            Así nació <strong>Vuelto</strong>: un proyecto personal para resolverme un
                            problema mío. Lo armé yo, en mis tiempos libres. Ahora está acá compartido en
                            internet porque sospecho que no soy el único al que le pasa, y quiero validarlo
                            con gente real antes de meterle más tiempo.
                        </p>

                        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20 p-5 not-prose">
                            <p className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-2">
                                ⚠ Esto es una beta privada, gratis, en validación
                            </p>
                            <ul className="text-sm text-amber-900/90 dark:text-amber-200/90 space-y-1.5 list-disc list-inside font-medium">
                                <li><strong>No es un servicio financiero</strong>. No mueve plata, no presta, no invierte por vos.</li>
                                <li><strong>No es asesoramiento</strong>. Cualquier número o gráfico que veas es informativo.</li>
                                <li><strong>Puede tener bugs</strong>. Si encontrás uno, escribime — me ayudás un montón.</li>
                                <li><strong>Hoy es gratis</strong>. Si en el futuro se vuelve pago, te aviso antes y siempre te llevás tus datos.</li>
                            </ul>
                        </div>

                        <p>
                            Si te interesa o si tenés feedback (lo que sea: "esto no se entiende", "me
                            falta X", "esto está mal"), te leo. Es literalmente lo más valioso que podés
                            darme en este momento.
                        </p>
                    </div>

                    <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <a
                            href="mailto:agustinluna760@gmail.com?subject=Feedback%20de%20Vuelto"
                            onClick={() => analytics.landingCtaClicked('about_feedback')}
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                        >
                            <MessageSquare className="w-4 h-4" />
                            Mandame tu feedback
                        </a>
                        <a
                            href="https://www.linkedin.com/in/agustin-luna/"
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => analytics.landingCtaClicked('about_linkedin')}
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black text-sm rounded-2xl hover:bg-zinc-700 dark:hover:bg-zinc-100 transition-colors active:scale-95"
                        >
                            <ArrowUpRight className="w-4 h-4" />
                            Quién soy (LinkedIn)
                        </a>
                    </div>
                </div>
            </Section>

            {/* ───── FINAL CTA ───── */}
            <Section className="py-24 sm:py-32 relative overflow-hidden">
                <div className="absolute inset-0 -z-10">
                    <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-br from-emerald-500/10 via-sky-500/5 to-purple-500/10" />
                </div>

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-6">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs font-black tracking-wider text-zinc-700 dark:text-zinc-300">
                            BETA PRIVADA · CUPOS LIMITADOS
                        </span>
                    </div>

                    <h2 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] mb-6">
                        Tu próximo gasto <br />
                        <span className="bg-gradient-to-r from-emerald-500 to-sky-500 bg-clip-text text-transparent">
                            ya está pasando.
                        </span>
                    </h2>
                    <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto mb-10 font-medium">
                        Sumate ahora y empezá a ordenarte. Sin tarjeta, sin compromiso.
                    </p>

                    <div className="flex flex-col items-center gap-4">
                        <WaitlistForm source="final_cta" cta="Sumarme" large />
                        <Link
                            to="/register"
                            onClick={() => analytics.landingCtaClicked('final_register')}
                            className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-bold inline-flex items-center gap-1 transition-colors"
                        >
                            o probá ahora con un click <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </Section>

            {/* ───── FOOTER ───── */}
            <footer className="border-t border-zinc-200 dark:border-zinc-800 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-2 flex-wrap justify-center">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                                <Wallet className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="font-black text-zinc-900 dark:text-white">Vuelto</span>
                            <span className="text-xs text-zinc-400">· Proyecto personal de Agustín Luna · Hecho con 🧉 en Argentina</span>
                        </div>

                        <div className="flex items-center gap-6 text-sm font-bold text-zinc-500 dark:text-zinc-400 flex-wrap justify-center">
                            <Link to="/login" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Iniciar sesión</Link>
                            <a href="mailto:agustinluna760@gmail.com" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Contacto</a>
                            <Link to="/privacy" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Privacidad</Link>
                            <Link to="/terms" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Términos</Link>
                        </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center max-w-3xl mx-auto leading-relaxed">
                        Vuelto es un proyecto personal en beta privada, gratuito y sin fines comerciales por el momento.
                        No es una entidad financiera ni está regulado por el BCRA, la CNV o la UIF. No mueve plata, no
                        presta servicios bancarios y no constituye asesoramiento financiero. Los datos del usuario están
                        protegidos según la Ley 25.326 de Protección de Datos Personales.
                    </p>
                </div>
            </footer>
        </div>
    );
}
