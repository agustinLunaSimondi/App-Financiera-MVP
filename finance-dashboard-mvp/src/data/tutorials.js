/**
 * Definiciones de tutoriales que se renderizan en HelpPage y se abren en el TutorialModal.
 *
 * Cada tutorial declara su tema visual (icon + gradient color) en lugar de
 * apuntar a una imagen. El TutorialModal arma un header CSS sin assets externos.
 *
 * El campo `cta` apunta a una ruta interna a la que se redirige al cerrar el
 * modal — útil para que el user salte directo a "probarlo".
 */

import {
    LayoutDashboard, Wallet, PieChart, PiggyBank, Link2,
    FileText, Flame, Zap, Receipt, Sparkles,
} from 'lucide-react';

export const tutorials = {
    // ─── Primeros pasos ───────────────────────────────────────
    'first-expense': {
        title: 'Tu primer gasto en 30 segundos',
        description: 'El flujo más simple para empezar a usar Vuelto hoy.',
        badge: 'Empezá acá',
        icon: Receipt,
        accent: 'emerald',
        cta: { label: 'Cargar mi primer gasto', path: '/transactions' },
        content: [
            { type: 'text', title: 'Abrí Transacciones', text: 'En el menú lateral (o en la barra inferior en móvil) tocá "Transacciones".' },
            { type: 'text', title: 'Nueva transacción', text: 'Click en el botón verde "+ Nueva Transacción" arriba a la derecha. En móvil usá el FAB central de la barra inferior.' },
            { type: 'text', title: 'Completá 3 cosas', text: 'Monto (negativo si es gasto), categoría y descripción corta. La cuenta y la fecha vienen con defaults sensatos.' },
            { type: 'text', title: 'Listo', text: 'Tu gasto ya aparece en el dashboard y se descuenta de los presupuestos que tengas armados.' },
        ],
    },
    'first-budget': {
        title: 'Tu primer presupuesto',
        description: 'Definí cuánto querés gastar como máximo en una categoría por mes.',
        badge: 'Esencial',
        icon: PieChart,
        accent: 'violet',
        cta: { label: 'Crear presupuesto', path: '/budget' },
        content: [
            { type: 'text', title: 'Elegí una categoría', text: 'Empezá con una sola — por ejemplo "Comida" o "Salidas". Después podés sumar más.' },
            { type: 'text', title: 'Definí el monto mensual', text: 'Pensá cuánto querías gastar el mes pasado vs. lo que realmente gastaste. Si excediste, usá ese número como target.' },
            { type: 'text', title: 'Color distintivo', text: 'Elegí un color que te ayude a identificar el presupuesto rápido en los gráficos. Tenés 10 colores predefinidos + selector libre.' },
            { type: 'text', title: '¿Modo Chanchito?', text: 'Activá Modo Chanchito desde el panel violeta arriba si querés que la app te frene cuando se llene. Sin esto, los presupuestos son sugerencias y solo te avisan.' },
        ],
    },
    'first-goal': {
        title: 'Tu primera meta de ahorro',
        description: 'Definí un objetivo y la app te muestra el progreso en tiempo real.',
        badge: 'Recomendado',
        icon: PiggyBank,
        accent: 'amber',
        cta: { label: 'Crear meta', path: '/savings' },
        content: [
            { type: 'text', title: 'Pensá el objetivo', text: 'Empezá con algo concreto: "Vacaciones 2027", "Fondo de emergencia", "MacBook". Cuanto más específico, mejor.' },
            { type: 'text', title: 'Monto y fecha', text: 'El monto objetivo es cuánto querés juntar. La fecha límite es opcional pero ayuda a calcular el ritmo.' },
            { type: 'text', title: 'Depositá', text: 'Cuando ahorres algo, tocá "Depósito" en la card de la meta y registrá el monto. La barra de progreso se actualiza al instante.' },
            { type: 'text', title: 'Automatizá con el ⚡', text: 'El ícono ⚡ en cada meta abre las reglas de auto-depósito: cada vez que entre un ingreso en una categoría, un % o monto fijo va solo a esta meta. "Pagate primero" sin pensarlo.' },
        ],
    },

    // ─── Explora por área ─────────────────────────────────────
    'transactions': {
        title: 'Transacciones y filtros',
        description: 'Cargar, filtrar, buscar y dejar que Aki categorice por vos.',
        icon: Wallet,
        accent: 'blue',
        cta: { label: 'Ir a Transacciones', path: '/transactions' },
        content: [
            { type: 'text', title: 'Filtros rápidos', text: 'Arriba de la lista tenés pill toggles: tipo (Ingresos / Egresos / Todos) y fecha (Este mes / 7 días / Año / Todo / Personalizado).' },
            { type: 'text', title: 'Rango personalizado', text: 'El botón "Personalizado" abre un calendario con Desde / Hasta. Útil para reportes a contador o análisis de período custom.' },
            { type: 'text', title: 'Sugerencias de Aki', text: 'El botón "Sugerencias de Aki" arriba detecta transacciones sin categorizar correctamente y propone una categoría. Revisás y aceptás las que te convencen.' },
            { type: 'text', title: 'Contexto macro AR', text: 'Arriba de la lista vas a ver el panel de inflación real con dólar blue + IPC del mes. Te ayuda a leer tus gastos en pesos en contexto.' },
        ],
    },
    'budgets-and-chanchito': {
        title: 'Presupuestos y Modo Chanchito',
        description: 'Límites mensuales por categoría — sugerencias o reglas duras.',
        badge: 'Nuevo',
        icon: PieChart,
        accent: 'violet',
        cta: { label: 'Ir a Presupuestos', path: '/budget' },
        content: [
            { type: 'text', title: 'Crear un presupuesto', text: 'Click en "Nuevo Presupuesto" y elegí categoría + monto + periodicidad (mensual / semanal / anual). Cada presupuesto puede tener su color.' },
            { type: 'text', title: 'Modo estándar', text: 'Por defecto los presupuestos son sugerencias: vas a ver el % gastado y te avisamos si te pasás, pero podés seguir cargando gastos.' },
            { type: 'text', title: 'Modo Chanchito', text: 'En el panel violeta arriba podés activar el Modo Chanchito. Cuando un presupuesto se llena, la app te impide cargar más gastos en esa categoría hasta el mes siguiente.' },
            { type: 'text', title: '¿Cuándo activar Chanchito?', text: 'Útil para categorías donde tendés a gastar de más sin querer (delivery, salidas, taxis). El bloqueo es 100% local — podés volver a estándar cuando quieras.' },
        ],
    },
    'savings-and-automation': {
        title: 'Metas y automatizaciones',
        description: 'Crear objetivos y configurar reglas que mueven plata sola.',
        badge: 'Power user',
        icon: PiggyBank,
        accent: 'amber',
        cta: { label: 'Ir a Metas', path: '/savings' },
        content: [
            { type: 'text', title: 'Crear una meta', text: 'Definí nombre, monto objetivo y opcionalmente una fecha límite. La barra de progreso se actualiza con cada depósito.' },
            { type: 'text', title: 'Depósitos manuales', text: 'En la card de la meta tocá "Depósito" e ingresá el monto. Útil cuando movés plata a mano de tu cuenta corriente a tu cuenta de ahorro.' },
            { type: 'text', title: 'Auto-depósito con ⚡', text: 'El ícono del rayo abre las reglas. Cada regla dice "cuando reciba ingreso en categoría X, depositar Y% o Z pesos". Ej: 10% de cada sueldo va a "Vacaciones".' },
            { type: 'text', title: 'Activar / pausar', text: 'Las reglas se pueden pausar sin borrar. Útil si querés frenar las automatizaciones temporalmente (ej: estás con apretón financiero).' },
        ],
    },
    'integrations': {
        title: 'Integraciones',
        description: 'Conectar Mercado Pago para importar movimientos automáticamente.',
        icon: Link2,
        accent: 'blue',
        cta: { label: 'Ir a Integraciones', path: '/integrations' },
        content: [
            { type: 'text', title: 'Mercado Pago', text: 'En Integraciones tocá "Conectar". Te lleva al login de MP, autorizás y volvés. Importamos los últimos 30 días de movimientos al toque.' },
            { type: 'text', title: 'Sync automático', text: 'Una vez conectado, la app sincroniza cada 24h en background. Si querés forzarlo, hay un botón "Sincronizar ahora".' },
            { type: 'text', title: 'Auto-categorización', text: 'Los movimientos importados aplican reglas de categorización por keywords (Rappi → Comida, SUBE → Transporte, etc.). Lo que no matchee queda en "Otros" para que lo revises.' },
            { type: 'text', title: 'Privacidad de tokens', text: 'Tu token de MP se guarda cifrado en la base. Podés desconectar cuando quieras desde el mismo lugar.' },
        ],
    },
    'afip-report': {
        title: 'Reporte AFIP para contador',
        description: 'Marcá categorías deducibles y exportá PDF o Excel.',
        badge: 'Freelancers',
        icon: FileText,
        accent: 'emerald',
        cta: { label: 'Ir a Configuración', path: '/settings' },
        content: [
            { type: 'text', title: '¿Para quién es?', text: 'Pensado para monotributistas y freelancers que necesitan pasarle gastos deducibles a su contador.' },
            { type: 'text', title: 'Marcar deducibles', text: 'En Configuración → "Reporte para contador" tildá las categorías que son deducibles para vos (Servicios, Honorarios, Internet, etc.). El badge AFIP queda guardado.' },
            { type: 'text', title: 'Generar', text: 'Elegí período (típicamente un mes calendario) y formato. El PDF es un resumen agrupado por categoría; el Excel es el detalle tx por tx.' },
            { type: 'text', title: 'Tu contador completa', text: 'El Excel deja columnas vacías para CUIT del proveedor, Neto e IVA 21%. Esos los llena tu contador — vos solo le pasás el archivo.' },
        ],
    },
    'streaks': {
        title: 'Racha sin gastos',
        description: 'Gamificación para frenar gastos impulsivos.',
        badge: 'Engagement',
        icon: Flame,
        accent: 'orange',
        cta: { label: 'Ver mi racha', path: '/' },
        content: [
            { type: 'text', title: '¿Qué cuenta como "día sin gasto"?', text: 'Un día en el que NO registraste ningún gasto manual. Los gastos automáticos (suscripciones recurrentes, sueldos) NO rompen la racha — esos no son decisiones del día.' },
            { type: 'text', title: 'Dónde la ves', text: 'En el sidebar (desktop) o en la sección de stats personales aparece un pill con un flame. Muestra tu racha actual y el próximo badge a desbloquear.' },
            { type: 'text', title: 'Badges', text: '🌱 a los 7 días, 🌳 a los 30, 🏆 a los 90 consecutivos. Una vez desbloqueado un badge, queda para siempre aunque rompas la racha.' },
            { type: 'text', title: 'Por qué', text: 'Bajar el "gasto inconsciente" diario. No es competencia con nadie — es contra vos mismo.' },
        ],
    },
};
