import React from 'react';
import { Layout } from '../features/common/components/Layout';
import { Card } from '../features/common/components/Card';
import { 
    BookOpen, 
    Zap, 
    Shield, 
    Smartphone, 
    ArrowRight, 
    CheckCircle2, 
    HelpCircle,
    PlayCircle,
    Info,
    MessageSquare
} from 'lucide-react';
import { motion } from 'framer-motion';

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

const TutorialCard = ({ title, description, badge, icon: Icon }) => (
    <div className="p-6 rounded-2xl glass-card space-y-3 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Icon size={48} />
        </div>
        {badge && (
            <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                {badge}
            </span>
        )}
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {description}
        </p>
        <button className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:gap-3 transition-all">
            Ver guía <ArrowRight size={14} />
        </button>
    </div>
);

export default function HelpPage() {
    return (
        <Layout>
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
                        Domina tus finanzas con nuestras guías paso a paso y tutoriales interactivos diseñados para el éxito económico.
                    </p>
                </div>

                {/* Popular Guides */}
                <Section title="Guías de Inicio Rápido" icon={Zap} delay={0.1}>
                    <TutorialCard 
                        title="Dashboard 101" 
                        description="Aprende a interpretar tus KPIs, gráficos de ingresos vs gastos y el balance general."
                        badge="Básico"
                        icon={PlayCircle}
                    />
                    <TutorialCard 
                        title="Gestión de Cuentas" 
                        description="Cómo vincular tus cuentas bancarias, billeteras digitales y tarjetas para un seguimiento total."
                        badge="Esencial"
                        icon={Shield}
                    />
                    <TutorialCard 
                        title="Presupuestos Inteligentes" 
                        description="Configura límites por categoría y recibe alertas cuando estés cerca de superarlos."
                        badge="Avanzado"
                        icon={CheckCircle2}
                    />
                </Section>

                {/* Categories */}
                <Section title="Explora por Temas" icon={BookOpen} delay={0.2}>
                    <TutorialCard 
                        title="Transacciones" 
                        description="Cómo categorizar gastos, filtrar por fecha y exportar reportes en CSV."
                        icon={MessageSquare}
                    />
                    <TutorialCard 
                        title="Metas de Ahorro" 
                        description="Crea objetivos, define plazos y observa el progreso de tu fondo de emergencia."
                        icon={Info}
                    />
                    <TutorialCard 
                        title="Integraciones" 
                        description="Vincula Mercado Pago y otras plataformas para automatizar tus registros."
                        icon={Zap}
                    />
                </Section>

                {/* Video Support Placeholder */}
                <div className="rounded-3xl glass-card p-10 flex flex-col md:flex-row items-center gap-10 bg-gradient-to-br from-emerald-500/5 to-blue-500/5 border-emerald-500/10">
                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">¿Prefieres ver un video?</h2>
                        <p className="text-zinc-500 dark:text-zinc-400">
                            Preparamos una serie de videos cortos de 2 minutos para que aprendas a usar FinanceFlow sin leer una sola palabra.
                        </p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                            <button className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20">
                                Ir a la Academia
                            </button>
                            <button className="px-6 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                Ver FAQ
                            </button>
                        </div>
                    </div>
                    <div className="w-full md:w-1/3 aspect-video rounded-2xl bg-zinc-900 flex items-center justify-center relative overflow-hidden shadow-2xl">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551288049-bbbda536639a?auto=format&fit=crop&q=80&w=2070')] bg-cover opacity-50"></div>
                        <PlayCircle className="text-white relative z-10" size={64} />
                    </div>
                </div>

                {/* Still Need Help */}
                <div className="text-center space-y-6 pt-10">
                    <h2 className="text-2xl font-bold">¿Aún tienes dudas?</h2>
                    <div className="flex justify-center gap-8">
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
                                <MessageSquare size={20} />
                            </div>
                            <span className="text-sm font-bold">Soporte</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2">
                                <Smartphone size={20} />
                            </div>
                            <span className="text-sm font-bold">App Móvil</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center mb-2">
                                <Shield size={20} />
                            </div>
                            <span className="text-sm font-bold">Seguridad</span>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
