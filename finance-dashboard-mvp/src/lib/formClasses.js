/**
 * Tokens visuales compartidos. Importar en lugar de definir clases locales en cada form/page.
 * Mantener esto como single-source-of-truth del lenguaje visual.
 */

// ─────────────────────────────────────────────
// INPUTS / SELECTS / TEXTAREAS
// ─────────────────────────────────────────────
export const INPUT_CLS =
    "w-full px-4 py-3 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/60 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

export const SELECT_CLS = INPUT_CLS + " appearance-none pr-10";

export const TEXTAREA_CLS = INPUT_CLS + " resize-none min-h-[80px]";

export const LABEL_CLS =
    "block text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-1.5";

// ─────────────────────────────────────────────
// BUTTONS
// ─────────────────────────────────────────────
export const BTN_BASE =
    "inline-flex items-center justify-center gap-2 font-bold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100";

export const BTN_PRIMARY =
    BTN_BASE + " px-5 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl shadow-lg shadow-zinc-900/10 dark:shadow-zinc-100/5 hover:shadow-xl";

export const BTN_PRIMARY_ACCENT =
    BTN_BASE + " px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20";

export const BTN_SECONDARY =
    BTN_BASE + " px-5 py-3 bg-zinc-100 dark:bg-zinc-800/60 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl";

export const BTN_GHOST =
    BTN_BASE + " px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl";

export const BTN_DANGER =
    BTN_BASE + " px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-500/20";

// ─────────────────────────────────────────────
// FEEDBACK / STATE BOXES
// ─────────────────────────────────────────────
export const ERROR_BOX =
    "flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-300 text-sm font-medium";

export const WARNING_BOX =
    "flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-300 text-sm font-medium";

export const SUCCESS_BOX =
    "flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm font-medium";

// ─────────────────────────────────────────────
// FOCUS RING (para components que custom)
// ─────────────────────────────────────────────
export const FOCUS_RING =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900";

// ─────────────────────────────────────────────
// FRAMER MOTION PRESETS
// ─────────────────────────────────────────────
export const MOTION_CARD = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] },
};

export const MOTION_ITEM = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, ease: 'easeOut' },
};

export const MOTION_PAGE = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.2 },
};

export const MOTION_FADE_IN_UP = (delay = 0) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay, ease: [0.23, 1, 0.32, 1] },
});
