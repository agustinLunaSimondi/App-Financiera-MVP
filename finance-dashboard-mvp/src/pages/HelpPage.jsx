import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
    BookOpen, Zap, Shield, ArrowRight,
    HelpCircle, MessageSquare, Search,
    X, ChevronDown, ChevronUp, LayoutDashboard,
    PiggyBank, Code, Flame, FileText, Users, Sparkles,
    Wallet, PieChart, Link2, Receipt,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { tutorials } from '../data/tutorials';

// ─── FAQ data agrupada por categoría ────────────────────────
// Cada FAQ tiene una `tags` que se usa para el filtrado por buscador y por
// chip de categoría. El orden de la lista refleja qué tan central es la
// pregunta dentro de su categoría.
const faqGroups = [
    {
        id: 'basico',
        label: 'Empezar a usar la app',
        icon: BookOpen,
        accent: 'emerald',
        items: [
            { q: '¿Cómo agrego mi primera transacción?', a: 'En el menú lateral entrá a "Transacciones" y tocá "Nueva Transacción". Completá monto, categoría y descripción. En móvil podés usar el botón verde (+) del centro de la barra inferior.' },
            { q: '¿Para qué sirve el Dashboard?', a: 'Es tu vista de resumen: balance total, ingresos y gastos del período, gráfico de evolución y proyección de fin de mes cuando el filtro coincide con el mes en curso.' },
            { q: '¿Cómo cambio el modo oscuro?', a: 'El toggle de sol/luna está en la barra superior en desktop, o en Configuración → Apariencia. La preferencia queda guardada en tu dispositivo.' },
            { q: '¿Cómo veo gastos en un rango personalizado?', a: 'En Dashboard y Transacciones, al lado de los botones de fecha hay un chip "Personalizado" con un ícono de calendario. Te abre un calendario para elegir Desde / Hasta.' },
            { q: '¿Puedo exportar mis datos?', a: 'Sí. Configuración → "Exportar Datos" baja un JSON con todo. Si necesitás un Excel formato AFIP, mirá la sección "Reporte para contador".' },
        ],
    },
    {
        id: 'presupuestos',
        label: 'Presupuestos',
        icon: PieChart,
        accent: 'violet',
        items: [
            { q: '¿Cómo configuro un presupuesto?', a: 'En "Presupuestos" tocá "Nuevo Presupuesto". Elegí categoría, monto mensual (o semanal/anual), color, y la fecha de inicio. Cuando cargues gastos en esa categoría se descuentan automáticamente.' },
            { q: '¿Cómo elijo el color de un presupuesto?', a: 'Al crear o editar vas a ver una paleta de 10 colores + un selector libre (el círculo con "+"). El color pinta la barra de progreso y la card.' },
            { q: '¿Para qué sirve el "Modo Chanchito"?', a: 'Cada presupuesto mensual es un chanchito: cuando se llena, la app no te deja cargar más gastos en esa categoría hasta el mes siguiente. En modo estándar los presupuestos son sugerencias — en Modo Chanchito son límites duros. Sirve cuando querés frenarte a vos mismo en alguna categoría puntual.' },
            { q: '¿Por qué el gráfico de evolución a veces muestra un solo punto?', a: 'Si el filtro es muy corto (ej: este mes), antes mostraba un solo bucket mensual. Ahora podés cambiar la granularidad arriba del gráfico (Días / Sem / Meses / Años). La app además detecta automáticamente la mejor granularidad según el rango.' },
        ],
    },
    {
        id: 'metas',
        label: 'Metas de ahorro',
        icon: PiggyBank,
        accent: 'amber',
        items: [
            { q: '¿Qué son las metas de ahorro?', a: 'Objetivos financieros con un monto target y opcionalmente una fecha límite (vacaciones, fondo de emergencia, compra grande). Podés registrar depósitos manuales o automatizar con reglas.' },
            { q: '¿Cómo funcionan las automatizaciones de metas?', a: 'En cada meta hay un ícono ⚡. Te deja crear reglas: "cuando reciba un ingreso en categoría X, depositar Y% (o Z fijo) a esta meta". Cada vez que entre una transacción en esa categoría, la app mueve la plata sola.' },
            { q: '¿Puedo pausar una regla sin borrarla?', a: 'Sí. En el modal de reglas, cada regla tiene un toggle power on/off. La pausada queda inactiva pero la configuración se conserva.' },
        ],
    },
    {
        id: 'afip',
        label: 'AFIP y reportes',
        icon: FileText,
        accent: 'emerald',
        items: [
            { q: '¿Qué es el "Reporte para contador" (AFIP)?', a: 'Es una exportación pensada para freelancers y monotributistas. Marcás qué categorías son deducibles (Servicios, Honorarios, Internet, etc.) y la app genera un PDF resumen + un Excel detallado. El Excel deja columnas vacías para CUIT del proveedor, Neto e IVA — esas las completa tu contador. Está en Configuración → "Reporte para contador (AFIP)".' },
            { q: '¿Cómo marco una categoría como deducible?', a: 'Dos caminos: (1) Configuración → Reporte AFIP → tildá en la lista, o (2) editás la categoría desde "Gestionar Categorías" y activás el checkbox "Categoría deducible". Las marcadas muestran un badge AFIP verde.' },
            { q: '¿Puedo marcar varias categorías de un toque?', a: 'Sí. En la sección de AFIP hay botones "Marcar todas" y "Limpiar" arriba de la lista — útiles si querés empezar con todas marcadas y desmarcar las que no aplican.' },
        ],
    },
    {
        id: 'engagement',
        label: 'Racha, widgets y novedades',
        icon: Flame,
        accent: 'orange',
        items: [
            { q: '¿Cómo funcionan los días sin gasto (racha)?', a: 'Un día cuenta como "sin gasto" si no registraste ningún gasto manual. Los gastos automáticos (suscripciones recurrentes, sueldos) NO rompen la racha porque no son decisiones del día. Ves tu racha actual en el sidebar, con badges desbloqueables a los 7 / 30 / 90 días seguidos.' },
            { q: '¿Cómo creo un widget embebible?', a: 'En Configuración → "Widgets embebibles" elegís el tipo (balance, progreso de meta, gasto del mes). La app te devuelve un código <iframe> para pegar en Notion, tu blog o donde quieras. Sin login.' },
            { q: '¿Qué pasa si roto el token de un widget?', a: 'Los embeds viejos dejan de funcionar inmediatamente. Útil si compartiste el link sin querer o si querés cortar el acceso.' },
            { q: '¿Por qué "Tu lugar en el ranking" dice Próximamente?', a: 'Para comparar tu gasto con otros usuarios sin leakear datos individuales necesitamos al menos 50 personas por grupo (edad × zona × categoría). Estamos sumando beta-testers. Cuando lleguemos a esa masa crítica te avisamos por mail y se activa solo.' },
        ],
    },
    {
        id: 'integraciones',
        label: 'Integraciones',
        icon: Link2,
        accent: 'blue',
        items: [
            { q: '¿Cómo conecto Mercado Pago?', a: 'En "Integraciones" tocá "Conectar Mercado Pago". Te redirigimos al login de MP, autorizás, y al volver importamos los últimos 30 días de movimientos. Después sincroniza solo cada 24h.' },
            { q: '¿Mis tokens de MP están seguros?', a: 'Sí. Se guardan cifrados con Fernet en la base, no en plaintext. Podés desconectar cuando quieras desde la misma página.' },
        ],
    },
    {
        id: 'privacidad',
        label: 'Privacidad y seguridad',
        icon: Shield,
        accent: 'indigo',
        items: [
            { q: '¿Mis datos son seguros?', a: 'Tu información se guarda cifrada. Las contraseñas usan hash con bcrypt, los tokens de integraciones se cifran at-rest, y los JWTs tienen TTL corto + revocación. Nunca compartimos datos individuales con terceros.' },
            { q: '¿Cómo elimino mi cuenta?', a: 'Configuración → "Eliminar Cuenta". Pide confirmación tipeando ELIMINAR. Borra todas tus tx, presupuestos, metas, integraciones y datos personales. Acción irreversible.' },
        ],
    },
];

// Helper: gradient + colores por acento. Usado por TutorialModal y NewFeatureCard.
const ACCENT_THEMES = {
    emerald: {
        gradFrom: 'from-emerald-500', gradTo: 'to-teal-600',
        bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400',
        border: 'hover:border-emerald-500/30', ring: 'focus-visible:ring-emerald-500/40',
    },
    blue: {
        gradFrom: 'from-blue-500', gradTo: 'to-indigo-600',
        bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400',
        border: 'hover:border-blue-500/30', ring: 'focus-visible:ring-blue-500/40',
    },
    violet: {
        gradFrom: 'from-violet-500', gradTo: 'to-purple-600',
        bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400',
        border: 'hover:border-violet-500/30', ring: 'focus-visible:ring-violet-500/40',
    },
    amber: {
        gradFrom: 'from-amber-500', gradTo: 'to-orange-600',
        bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400',
        border: 'hover:border-amber-500/30', ring: 'focus-visible:ring-amber-500/40',
    },
    orange: {
        gradFrom: 'from-orange-500', gradTo: 'to-rose-600',
        bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400',
        border: 'hover:border-orange-500/30', ring: 'focus-visible:ring-orange-500/40',
    },
    indigo: {
        gradFrom: 'from-indigo-500', gradTo: 'to-purple-600',
        bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400',
        border: 'hover:border-indigo-500/30', ring: 'focus-visible:ring-indigo-500/40',
    },
};
const themeOf = (a) => ACCENT_THEMES[a] || ACCENT_THEMES.emerald;


// ─── Cards ──────────────────────────────────────────────────
const TutorialCard = ({ tutorialId, onClick }) => {
    const t = tutorials[tutorialId];
    if (!t) return null;
    const theme = themeOf(t.accent);
    const Icon = t.icon;

    return (
        <button
            type="button"
            onClick={() => onClick(tutorialId)}
            className={`group p-5 rounded-2xl glass-card text-left relative overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99] ${theme.border}`}
        >
            <div className="flex items-start gap-3 mb-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${theme.bg} ${theme.text} shrink-0`}>
                    <Icon size={20} />
                </div>
                {t.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${theme.bg} ${theme.text} font-black uppercase tracking-wider whitespace-nowrap`}>
                        {t.badge}
                    </span>
                )}
            </div>
            <h3 className="font-black text-zinc-900 dark:text-white mb-1.5 leading-tight">
                {t.title}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-3">
                {t.description}
            </p>
            <span className={`text-xs font-bold flex items-center gap-1.5 ${theme.text} group-hover:gap-2 transition-all`}>
                Ver guía <ArrowRight size={12} />
            </span>
        </button>
    );
};

const NewFeatureCard = ({ icon: Icon, title, description, cta, onClick, badge, color = 'emerald' }) => {
    const theme = themeOf(color);
    return (
        <div className={`p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm flex flex-col gap-3 transition-all ${theme.border}`}>
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme.bg} ${theme.text}`}>
                    <Icon size={20} />
                </div>
                {badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-black uppercase tracking-wider">
                        {badge}
                    </span>
                )}
            </div>
            <div className="flex-1">
                <h3 className="font-black text-zinc-900 dark:text-white mb-1">{title}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{description}</p>
            </div>
            {onClick && (
                <button onClick={onClick} className={`text-xs font-bold flex items-center gap-1.5 ${theme.text} self-start hover:gap-2 transition-all`}>
                    {cta} <ArrowRight size={12} />
                </button>
            )}
        </div>
    );
};

const Section = ({ title, icon: Icon, accent = 'emerald', children, delay = 0 }) => {
    const theme = themeOf(accent);
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            className="space-y-4"
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${theme.bg} ${theme.text}`}>
                    <Icon size={22} />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {children}
            </div>
        </motion.div>
    );
};

// ─── FAQ ────────────────────────────────────────────────────
const FAQItem = ({ q, a, isOpen, onToggle }) => (
    <div className="border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl overflow-hidden bg-white/40 dark:bg-zinc-900/40">
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between px-5 py-4 text-left font-bold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors gap-4"
        >
            <span className="text-sm">{q}</span>
            {isOpen ? <ChevronUp className="w-4 h-4 shrink-0 text-emerald-500" /> : <ChevronDown className="w-4 h-4 shrink-0 text-zinc-400" />}
        </button>
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                >
                    <p className="px-5 pb-5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800 pt-4">
                        {a}
                    </p>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

const FAQSection = () => {
    const [query, setQuery] = useState('');
    const [activeGroup, setActiveGroup] = useState('all');
    const [openItems, setOpenItems] = useState(() => new Set());

    const allItems = useMemo(() => {
        // Aplanamos las FAQs anotando su grupo para poder filtrar pero
        // mostrar pertenencia en los resultados.
        return faqGroups.flatMap((g) =>
            g.items.map((it, idx) => ({ ...it, _groupId: g.id, _groupLabel: g.label, _key: `${g.id}-${idx}` }))
        );
    }, []);

    const visibleItems = useMemo(() => {
        const q = query.trim().toLowerCase();
        return allItems.filter((it) => {
            if (activeGroup !== 'all' && it._groupId !== activeGroup) return false;
            if (!q) return true;
            return it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q);
        });
    }, [allItems, query, activeGroup]);

    const toggleItem = (key) => {
        setOpenItems((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };
    const openAll = () => setOpenItems(new Set(visibleItems.map((it) => it._key)));
    const closeAll = () => setOpenItems(new Set());

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="space-y-4"
        >
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <HelpCircle size={22} />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Preguntas Frecuentes</h2>
            </div>

            {/* Buscador */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                    type="text"
                    placeholder="Buscar en las FAQs (ej: chanchito, AFIP, racha...)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all text-zinc-900 dark:text-zinc-100"
                />
                {query && (
                    <button
                        type="button"
                        onClick={() => setQuery('')}
                        aria-label="Limpiar búsqueda"
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Chips de categoría + acciones */}
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => setActiveGroup('all')}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-colors ${
                        activeGroup === 'all'
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                >
                    Todas ({allItems.length})
                </button>
                {faqGroups.map((g) => {
                    const theme = themeOf(g.accent);
                    const isActive = activeGroup === g.id;
                    return (
                        <button
                            key={g.id}
                            type="button"
                            onClick={() => setActiveGroup(g.id)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                                isActive
                                    ? `${theme.bg} ${theme.text}`
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                            }`}
                        >
                            <g.icon size={12} />
                            {g.label} ({g.items.length})
                        </button>
                    );
                })}
                <div className="ml-auto flex gap-2 text-[10px] font-black uppercase tracking-wider">
                    <button
                        type="button"
                        onClick={openAll}
                        disabled={visibleItems.length === 0}
                        className="px-2 py-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Abrir todas
                    </button>
                    <button
                        type="button"
                        onClick={closeAll}
                        disabled={openItems.size === 0}
                        className="px-2 py-1 rounded-md text-zinc-500 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Cerrar todas
                    </button>
                </div>
            </div>

            {/* Lista */}
            {visibleItems.length === 0 ? (
                <div className="text-center py-10 text-sm text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl">
                    <p className="font-bold mb-1">Sin resultados</p>
                    <p className="text-xs">Probá con otra palabra o cambiá de categoría.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {visibleItems.map((it) => (
                        <div key={it._key} className="space-y-1">
                            {(activeGroup === 'all' || query) && (
                                <span className="text-[10px] uppercase tracking-widest font-black text-zinc-400 px-1">
                                    {it._groupLabel}
                                </span>
                            )}
                            <FAQItem
                                q={it.q}
                                a={it.a}
                                isOpen={openItems.has(it._key)}
                                onToggle={() => toggleItem(it._key)}
                            />
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
};


// ─── Tutorial Modal ─────────────────────────────────────────
// Renderiza un header CSS (gradient + icon + título) en lugar de imagen externa.
const TutorialModal = ({ isOpen, onClose, tutorial }) => {
    const navigate = useNavigate();
    if (!tutorial) return null;
    const theme = themeOf(tutorial.accent);
    const Icon = tutorial.icon;

    const handleCta = () => {
        onClose();
        navigate(tutorial.cta?.path || '/');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl flex flex-col"
                    >
                        {/* Header gradient — sin imágenes externas */}
                        <div className={`relative bg-gradient-to-br ${theme.gradFrom} ${theme.gradTo} px-8 py-10 text-white overflow-hidden`}>
                            {/* Decoración: círculos blur */}
                            <div className="absolute -top-16 -right-12 w-48 h-48 bg-white/15 rounded-full blur-2xl" />
                            <div className="absolute -bottom-16 -left-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />

                            <button
                                onClick={onClose}
                                aria-label="Cerrar"
                                className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 backdrop-blur-md transition-colors z-10"
                            >
                                <X size={18} />
                            </button>

                            <div className="relative z-10 flex flex-col items-start gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
                                    <Icon size={32} />
                                </div>
                                <div className="space-y-1">
                                    {tutorial.badge && (
                                        <span className="inline-block px-2 py-0.5 rounded-md bg-white/25 backdrop-blur-md text-[10px] font-black uppercase tracking-wider">
                                            {tutorial.badge}
                                        </span>
                                    )}
                                    <h2 className="text-2xl md:text-3xl font-black tracking-tight">{tutorial.title}</h2>
                                    <p className="text-sm text-white/90 max-w-md">{tutorial.description}</p>
                                </div>
                            </div>
                        </div>

                        {/* Pasos */}
                        <div className="p-8 md:p-10 space-y-6">
                            {tutorial.content.map((item, index) => (
                                <div key={index} className="flex gap-4">
                                    <div className={`shrink-0 w-9 h-9 rounded-full ${theme.bg} ${theme.text} flex items-center justify-center text-sm font-black`}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">{item.title}</h3>
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{item.text}</p>
                                    </div>
                                </div>
                            ))}

                            {/* CTA — links directos a la sección relevante */}
                            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                                <button
                                    onClick={onClose}
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors order-2 sm:order-1"
                                >
                                    Cerrar
                                </button>
                                {tutorial.cta && (
                                    <button
                                        onClick={handleCta}
                                        className={`px-5 py-3 rounded-xl bg-gradient-to-br ${theme.gradFrom} ${theme.gradTo} text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-transform order-1 sm:order-2`}
                                    >
                                        {tutorial.cta.label}
                                        <ArrowRight size={14} />
                                    </button>
                                )}
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
    const [whatsNewDismissed, setWhatsNewDismissed] = useLocalStorage('help-whats-new-dismissed', false);
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
                    Tutoriales rápidos, preguntas frecuentes y atajos a las secciones más usadas.
                </p>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Dashboard', icon: LayoutDashboard, path: '/', accent: 'emerald' },
                    { label: 'Transacciones', icon: Receipt, path: '/transactions', accent: 'blue' },
                    { label: 'Presupuestos', icon: PieChart, path: '/budget', accent: 'violet' },
                    { label: 'Metas', icon: PiggyBank, path: '/savings', accent: 'amber' },
                ].map(({ label, icon: Icon, path, accent }) => {
                    const theme = themeOf(accent);
                    return (
                        <button
                            key={path}
                            onClick={() => navigate(path)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 transition-all group ${theme.border}`}
                        >
                            <div className={`p-2 rounded-xl group-hover:scale-110 transition-transform ${theme.bg} ${theme.text}`}>
                                <Icon size={20} />
                            </div>
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Primeros pasos */}
            <Section title="Primeros pasos" icon={Zap} accent="emerald" delay={0.1}>
                <TutorialCard tutorialId="first-expense" onClick={openTutorial} />
                <TutorialCard tutorialId="first-budget" onClick={openTutorial} />
                <TutorialCard tutorialId="first-goal" onClick={openTutorial} />
            </Section>

            {/* Explora por área */}
            <Section title="Explora por área" icon={BookOpen} accent="blue" delay={0.15}>
                <TutorialCard tutorialId="transactions" onClick={openTutorial} />
                <TutorialCard tutorialId="budgets-and-chanchito" onClick={openTutorial} />
                <TutorialCard tutorialId="savings-and-automation" onClick={openTutorial} />
                <TutorialCard tutorialId="afip-report" onClick={openTutorial} />
                <TutorialCard tutorialId="integrations" onClick={openTutorial} />
                <TutorialCard tutorialId="streaks" onClick={openTutorial} />
            </Section>

            {/* Lo nuevo en Vueltito — dismissable */}
            {!whatsNewDismissed ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.5 }}
                    className="space-y-4"
                >
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Sparkles size={22} />
                            </div>
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Lo nuevo en Vueltito</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setWhatsNewDismissed(true)}
                            className="text-[11px] font-bold text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="No mostrar más"
                        >
                            Ocultar
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <NewFeatureCard icon={FileText} title="Reporte AFIP" description="Exportá deducibles en PDF o Excel para tu contador." cta="Configuración" onClick={() => navigate('/settings')} color="emerald" />
                        <NewFeatureCard icon={PiggyBank} title="Modo Chanchito" description="Presupuestos como límites duros. Cuando se llena no entra más." cta="Presupuestos" onClick={() => navigate('/budget')} color="violet" />
                        <NewFeatureCard icon={Flame} title="Racha sin gastos" description="Badges desbloqueables a los 7 / 30 / 90 días." cta="Ver mi racha" onClick={() => navigate('/')} color="orange" />
                        <NewFeatureCard icon={Zap} title="Automatizaciones de metas" description="Reglas que mueven plata a tus metas solas con cada ingreso." cta="Configurar" onClick={() => navigate('/savings')} color="amber" />
                        <NewFeatureCard icon={Code} title="Widgets embebibles" description="iframe con tu balance o meta para pegar en Notion." cta="Crear widget" onClick={() => navigate('/settings')} color="blue" />
                        <NewFeatureCard icon={Users} title="Tu lugar en el ranking" description="Próximamente — se activa cuando lleguemos a 50+ usuarios por grupo." badge="Próximamente" color="indigo" />
                    </div>
                </motion.div>
            ) : (
                <button
                    type="button"
                    onClick={() => setWhatsNewDismissed(false)}
                    className="text-xs text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-1.5 transition-colors"
                >
                    <Sparkles size={12} />
                    Volver a mostrar "Lo nuevo en Vueltito"
                </button>
            )}

            {/* FAQs */}
            <FAQSection />

            {/* Footer simplificado — sin imagen falsa de video */}
            <div className="rounded-3xl glass-card p-8 md:p-10 bg-gradient-to-br from-emerald-500/5 to-blue-500/5 border-emerald-500/10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                <div className="flex-1 space-y-3">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">¿Algo no encaja?</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                        Si no encontraste lo que buscabas o pegaste con un bug, escribime directo. La app está en beta y todo feedback ayuda.
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-1">
                        <a
                            href="mailto:agustinluna760@gmail.com?subject=Vueltito%20beta%20—%20Feedback"
                            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                        >
                            <MessageSquare size={18} /> Escribime
                        </a>
                        <button
                            onClick={() => navigate('/academy')}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-zinc-200"
                        >
                            <BookOpen size={18} /> Academia
                        </button>
                    </div>
                </div>
                {/* Mini "stats" — relleno visual sin imagen externa */}
                <div className="grid grid-cols-3 gap-3 md:w-72 shrink-0">
                    {[
                        { v: tutorials && Object.keys(tutorials).length, l: 'Guías', color: 'emerald' },
                        { v: faqGroups.reduce((s, g) => s + g.items.length, 0), l: 'FAQs', color: 'blue' },
                        { v: '1:1', l: 'Soporte', color: 'violet' },
                    ].map(({ v, l, color }) => {
                        const theme = themeOf(color);
                        return (
                            <div key={l} className={`p-4 rounded-xl ${theme.bg} text-center`}>
                                <p className={`text-2xl font-black ${theme.text}`}>{v}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mt-1">{l}</p>
                            </div>
                        );
                    })}
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
