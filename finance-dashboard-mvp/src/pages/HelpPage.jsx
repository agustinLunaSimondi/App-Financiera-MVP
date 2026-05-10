import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../features/common/components/Card';
import { 
    BookOpen, Zap, Shield, Smartphone, ArrowRight, 
    CheckCircle2, HelpCircle, PlayCircle, Info, MessageSquare,
    X, ExternalLink, ChevronDown, ChevronUp, LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { tutorials } from '../data/tutorials';

// ─── FAQ Data ────────────────────────────────────────────────
const faqs = [
    {
        q: '¿Cómo agrego mi primera transacción?',
        a: 'Ir a "Transacciones" en el menú lateral y hace clic en "Nueva Transacción". Completá el monto, categoría y fecha. Podés crear categorías nuevas directamente desde ese formulario.'
    },
    {
        q: '¿Para qué sirve el Dashboard?',
        a: 'El Dashboard es tu vista principal con un resumen de tus finanzas: balance total, ingresos y gastos del mes, KPIs y gráficos de tendencias. Es tu punto de partida cada vez que entrás a la app.'
    },
    {
        q: '¿Cómo configuro un presupuesto?',
        a: 'En la sección "Presupuestos" podés definir un límite de gasto por categoría (por ej. Alimentación: $50.000/mes). La app te muestra en tiempo real cuánto llevás gastado y te alerta si estás cerca del límite.'
    },
    {
        q: '¿Qué son las metas de ahorro?',
        a: 'Las metas te permiten definir objetivos financieros (vacaciones, fondo de emergencia, compra de un bien). Podés registrar contribuciones y ver el progreso en tiempo real con una barra visual.'
    },
    {
        q: '¿Cómo conecto Mercado Pago?',
        a: 'En "Integraciones" hacé clic en "Conectar Mercado Pago". Serás redirigido para autorizar el acceso. Una vez conectado, podés sincronizar tus cobros y pagos automáticamente.'
    },
    {
        q: '¿Mis datos son seguros?',
        a: 'Sí. Tu información se almacena de forma cifrada. Las contraseñas se guardan con hash y los tokens de integración están protegidos. Nunca compartimos tus datos con terceros.'
    },
    {
        q: '¿Cómo cambio el modo oscuro?',
        a: 'El botón de modo oscuro (ícono de Luna/Sol) está disponible en la parte superior derecha en todas las páginas. También podés cambiar la configuración en la sección "Configuración".'
    },
    {
        q: '¿Puedo exportar mis datos?',
        a: 'Sí. En "Configuración" → "Gestión de Datos" → "Exportar Datos" podés descargar un archivo JSON con todas tus transacciones, presupuestos y cuentas.'
    },
];

// ─── Components ──────────────────────────────────────────────

const Section = ({ title, icon: Icon, children, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.5 }}
        className="space-y-4"
    >
        <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Icon size={24} />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {children}
        </div>
    </motion.div>
);

const TutorialCard = ({ title, description, badge, icon: Icon, onClick }) => (
    <div 
        onClick={onClick}
        className="p-6 rounded-2xl glass-card space-y-3 relative overflow-hidden group cursor-pointer hover:border-emerald-500/30 transition-all"
    >
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Icon size={48} />
        </div>
        {badge && (
            <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                {badge}
            </span>
        )}
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {title}
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {description}
        </p>
        <button className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:gap-3 transition-all">
            Ver guía <ArrowRight size={14} />
        </button>
    </div>
);

const FAQItem = ({ q, a, index }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-6 py-4 text-left font-bold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors gap-4"
            >
                <span>{q}</span>
                {open ? <ChevronUp className="w-4 h-4 flex-shrink-0 text-emerald-500" /> : <ChevronDown className="w-4 h-4 flex-shrink-0 text-zinc-400" />}
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <p className="px-6 pb-5 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800 pt-4">
                            {a}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const TutorialModal = ({ isOpen, onClose, tutorial }) => {
    const navigate = useNavigate();

    const handleGoToDashboard = () => {
        onClose();
        navigate('/');
    };

    if (!tutorial) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl flex flex-col"
                    >
                        {/* Image Header */}
                        <div className="w-full aspect-video md:aspect-[21/9] relative overflow-hidden">
                            <img 
                                src={tutorial.image} 
                                alt={tutorial.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-transparent to-transparent" />
                            <button 
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 backdrop-blur-md transition-colors"
                            >
                                <X size={24} />
                            </button>
                            <div className="absolute bottom-0 left-0 p-8 space-y-2">
                                {tutorial.badge && (
                                    <span className="px-2 py-1 rounded-md bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider">
                                        {tutorial.badge}
                                    </span>
                                )}
                                <h2 className="text-3xl font-black text-white">{tutorial.title}</h2>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8 md:p-12 space-y-10">
                            {tutorial.content.map((item, index) => (
                                <div key={index} className="space-y-4">
                                    {item.type === 'text' && (
                                        <>
                                            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-sm">
                                                    {index + 1}
                                                </div>
                                                {item.title}
                                            </h3>
                                            <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed text-lg pl-10">
                                                {item.text}
                                            </p>
                                        </>
                                    )}
                                </div>
                            ))}

                            {/* Footer CTA – link real al dashboard */}
                            <div className="pt-10 border-t border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <p className="font-bold text-zinc-900 dark:text-zinc-100">¿Listo para empezar?</p>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Pon en práctica lo aprendido ahora mismo.</p>
                                </div>
                                <button 
                                    onClick={handleGoToDashboard}
                                    className="px-8 py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all flex items-center gap-2"
                                >
                                    <LayoutDashboard size={18} />
                                    Ir al Dashboard
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// ─── Main Page ───────────────────────────────────────────────

export default function HelpPage() {
    const [selectedTutorial, setSelectedTutorial] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    const openTutorial = (id) => {
        setSelectedTutorial(tutorials[id]);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-12 pb-20">
            {/* Hero Section */}
            <div className="text-center space-y-4 max-w-2xl mx-auto py-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold"
                >
                    <HelpCircle size={14} /> Centro de Ayuda
                </motion.div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                    ¿Cómo podemos <span className="premium-gradient-text">ayudarte</span> hoy?
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-lg">
                    Domina tus finanzas con nuestras guías paso a paso y tutoriales interactivos.
                </p>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    {
                        label: 'Dashboard', icon: LayoutDashboard, path: '/',
                        btn: 'hover:bg-emerald-500/5 hover:border-emerald-500/30',
                        iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    },
                    {
                        label: 'Transacciones', icon: Zap, path: '/transactions',
                        btn: 'hover:bg-blue-500/5 hover:border-blue-500/30',
                        iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    },
                    {
                        label: 'Presupuestos', icon: Shield, path: '/budget',
                        btn: 'hover:bg-purple-500/5 hover:border-purple-500/30',
                        iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                    },
                    {
                        label: 'Academia', icon: BookOpen, path: '/academy',
                        btn: 'hover:bg-amber-500/5 hover:border-amber-500/30',
                        iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    },
                ].map(({ label, icon: Icon, path, btn, iconBg }) => (
                    <button
                        key={path}
                        onClick={() => navigate(path)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 transition-all group ${btn}`}
                    >
                        <div className={`p-2 rounded-xl group-hover:scale-110 transition-transform ${iconBg}`}>
                            <Icon size={20} />
                        </div>
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{label}</span>
                    </button>
                ))}
            </div>

            {/* Popular Guides */}
            <Section title="Guías de Inicio Rápido" icon={Zap} delay={0.1}>
                <TutorialCard 
                    title="Dashboard 101" 
                    description="Aprende a interpretar tus KPIs, gráficos de ingresos vs gastos y el balance general."
                    badge="Básico"
                    icon={PlayCircle}
                    onClick={() => openTutorial('dashboard-101')}
                />
                <TutorialCard 
                    title="Gestión de Cuentas" 
                    description="Cómo vincular tus cuentas bancarias, billeteras digitales y tarjetas para un seguimiento total."
                    badge="Esencial"
                    icon={Shield}
                    onClick={() => openTutorial('account-management')}
                />
                <TutorialCard 
                    title="Presupuestos Inteligentes" 
                    description="Configura límites por categoría y recibe alertas cuando estés cerca de superarlos."
                    badge="Avanzado"
                    icon={CheckCircle2}
                    onClick={() => openTutorial('smart-budgets')}
                />
            </Section>

            {/* Categories */}
            <Section title="Explora por Temas" icon={BookOpen} delay={0.2}>
                <TutorialCard 
                    title="Transacciones" 
                    description="Cómo categorizar gastos, filtrar por fecha y exportar reportes."
                    icon={MessageSquare}
                    onClick={() => openTutorial('transactions')}
                />
                <TutorialCard 
                    title="Metas de Ahorro" 
                    description="Crea objetivos, define plazos y observa el progreso de tu fondo de emergencia."
                    icon={Info}
                    onClick={() => openTutorial('savings-goals')}
                />
                <TutorialCard 
                    title="Integraciones" 
                    description="Vincula Mercado Pago y otras plataformas para automatizar tus registros."
                    icon={Zap}
                    onClick={() => openTutorial('integrations')}
                />
            </Section>

            {/* ─── FAQs ─────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="space-y-4"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <HelpCircle size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Preguntas Frecuentes (FAQ)</h2>
                </div>
                <div className="space-y-3">
                    {faqs.map((item, i) => (
                        <FAQItem key={i} q={item.q} a={item.a} index={i} />
                    ))}
                </div>
            </motion.div>

            {/* Still Need Help */}
            <div className="rounded-3xl glass-card p-10 flex flex-col md:flex-row items-center gap-10 bg-gradient-to-br from-emerald-500/5 to-blue-500/5 border-emerald-500/10">
                <div className="flex-1 space-y-4 text-center md:text-left">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">¿Prefieres explorar directamente?</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">
                        Volvé al dashboard para ver tus finanzas en tiempo real o visitá la academia para aprender conceptos financieros clave.
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                        <button 
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                        >
                            <LayoutDashboard size={18} /> Ir al Dashboard
                        </button>
                        <button 
                            onClick={() => navigate('/academy')}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <BookOpen size={18} /> Academia
                        </button>
                    </div>
                </div>
                <div className="w-full md:w-1/3 aspect-video rounded-2xl bg-zinc-900 flex items-center justify-center relative overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551288049-bbbda536639a?auto=format&fit=crop&q=80&w=2070')] bg-cover opacity-50"></div>
                    <PlayCircle className="text-white relative z-10" size={64} />
                </div>
            </div>

            <TutorialModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                tutorial={selectedTutorial} 
            />
        </div>
    );
}
