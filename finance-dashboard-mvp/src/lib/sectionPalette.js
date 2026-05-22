/**
 * Mapping de paleta por sección de la app.
 * Cada sección tiene un color que aplica a:
 * - Icon badge del header
 * - Acentos del PageHeader
 * - Hover rings de KPI cards relacionadas
 *
 * Usar `getSectionPalette(section)` para obtener el set de clases.
 */

const palettes = {
    dashboard: {
        accent: 'emerald',
        iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        iconText: 'text-emerald-600 dark:text-emerald-400',
        badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        ring: 'focus-visible:ring-emerald-500/40',
        gradientFrom: 'from-emerald-500',
        gradientTo: 'to-emerald-400',
    },
    transactions: {
        accent: 'emerald',
        iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        iconText: 'text-emerald-600 dark:text-emerald-400',
        badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        ring: 'focus-visible:ring-emerald-500/40',
        gradientFrom: 'from-emerald-500',
        gradientTo: 'to-emerald-400',
    },
    budget: {
        accent: 'indigo',
        iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
        iconText: 'text-indigo-600 dark:text-indigo-400',
        badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        ring: 'focus-visible:ring-indigo-500/40',
        gradientFrom: 'from-indigo-500',
        gradientTo: 'to-indigo-400',
    },
    savings: {
        accent: 'emerald',
        iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        iconText: 'text-emerald-600 dark:text-emerald-400',
        badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        ring: 'focus-visible:ring-emerald-500/40',
        gradientFrom: 'from-emerald-500',
        gradientTo: 'to-emerald-400',
    },
    recurring: {
        accent: 'blue',
        iconBg: 'bg-blue-500/10 dark:bg-blue-500/15',
        iconText: 'text-blue-600 dark:text-blue-400',
        badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        ring: 'focus-visible:ring-blue-500/40',
        gradientFrom: 'from-blue-500',
        gradientTo: 'to-blue-400',
    },
    cards: {
        accent: 'cyan',
        iconBg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
        iconText: 'text-cyan-600 dark:text-cyan-400',
        badge: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
        ring: 'focus-visible:ring-cyan-500/40',
        gradientFrom: 'from-cyan-500',
        gradientTo: 'to-cyan-400',
    },
    integrations: {
        accent: 'sky',
        iconBg: 'bg-sky-500/10 dark:bg-sky-500/15',
        iconText: 'text-sky-600 dark:text-sky-400',
        badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
        ring: 'focus-visible:ring-sky-500/40',
        gradientFrom: 'from-sky-500',
        gradientTo: 'to-sky-400',
    },
    settings: {
        accent: 'zinc',
        iconBg: 'bg-zinc-500/10 dark:bg-zinc-500/20',
        iconText: 'text-zinc-700 dark:text-zinc-300',
        badge: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300',
        ring: 'focus-visible:ring-zinc-500/40',
        gradientFrom: 'from-zinc-700',
        gradientTo: 'to-zinc-500',
    },
    chat: {
        accent: 'violet',
        iconBg: 'bg-violet-500/10 dark:bg-violet-500/15',
        iconText: 'text-violet-600 dark:text-violet-400',
        badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
        ring: 'focus-visible:ring-violet-500/40',
        gradientFrom: 'from-violet-500',
        gradientTo: 'to-violet-400',
    },
    academy: {
        accent: 'purple',
        iconBg: 'bg-purple-500/10 dark:bg-purple-500/15',
        iconText: 'text-purple-600 dark:text-purple-400',
        badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        ring: 'focus-visible:ring-purple-500/40',
        gradientFrom: 'from-purple-500',
        gradientTo: 'to-purple-400',
    },
    help: {
        accent: 'amber',
        iconBg: 'bg-amber-500/10 dark:bg-amber-500/15',
        iconText: 'text-amber-600 dark:text-amber-400',
        badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        ring: 'focus-visible:ring-amber-500/40',
        gradientFrom: 'from-amber-500',
        gradientTo: 'to-amber-400',
    },
};

export function getSectionPalette(section) {
    return palettes[section] || palettes.dashboard;
}

export default palettes;
