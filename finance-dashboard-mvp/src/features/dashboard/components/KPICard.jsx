import React from 'react';
import { ArrowUp, ArrowDown, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../../lib/utils';

const schemes = {
    blue: {
        badge: 'bg-blue-500/10 dark:bg-blue-500/20',
        icon: 'text-blue-600 dark:text-blue-400',
        glow: 'from-blue-500/25 to-transparent',
        accent: 'bg-blue-500',
        changeBg: 'bg-blue-50 dark:bg-blue-500/10',
        changeText: 'text-blue-700 dark:text-blue-400',
    },
    emerald: {
        badge: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        icon: 'text-emerald-600 dark:text-emerald-400',
        glow: 'from-emerald-500/25 to-transparent',
        accent: 'bg-emerald-500',
        changeBg: 'bg-emerald-50 dark:bg-emerald-500/10',
        changeText: 'text-emerald-700 dark:text-emerald-400',
    },
    rose: {
        badge: 'bg-rose-500/10 dark:bg-rose-500/20',
        icon: 'text-rose-600 dark:text-rose-400',
        glow: 'from-rose-500/25 to-transparent',
        accent: 'bg-rose-500',
        changeBg: 'bg-rose-50 dark:bg-rose-500/10',
        changeText: 'text-rose-700 dark:text-rose-400',
    },
    violet: {
        badge: 'bg-violet-500/10 dark:bg-violet-500/20',
        icon: 'text-violet-600 dark:text-violet-400',
        glow: 'from-violet-500/25 to-transparent',
        accent: 'bg-violet-500',
        changeBg: 'bg-violet-50 dark:bg-violet-500/10',
        changeText: 'text-violet-700 dark:text-violet-400',
    },
};

export function KPICard({ label, value, change, icon, scheme = 'emerald', delay = 0 }) {
    const Icon = icon || Wallet;
    const colors = schemes[scheme] || schemes.emerald;

    const isNegative = change !== '--' && (change.includes('-') || change.includes('↓'));
    const isPositive = change !== '--' && change.includes('+');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
            className="glass-card rounded-2xl overflow-hidden relative group hover:shadow-xl transition-shadow duration-300"
        >
            {/* Top accent line */}
            <div className={cn("absolute top-0 left-0 right-0 h-0.5 z-10", colors.accent)} />

            {/* Corner glow */}
            <div className={cn(
                "absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-50 bg-gradient-to-br",
                colors.glow
            )} />

            <div className="relative z-10 p-5 space-y-4">
                {/* Icon badge + label row */}
                <div className="flex items-center justify-between gap-2">
                    <div className={cn("p-2.5 rounded-xl shrink-0", colors.badge)}>
                        <Icon className={cn("w-4 h-4", colors.icon)} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500 text-right leading-tight">
                        {label}
                    </p>
                </div>

                {/* Value */}
                <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter block leading-none">
                    {value}
                </span>

                {/* Change pill */}
                <div className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg",
                    change === '--'
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
                        : isNegative
                            ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : isPositive
                                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : cn(colors.changeBg, colors.changeText)
                )}>
                    {isPositive && <ArrowUp className="w-3 h-3" />}
                    {isNegative && <ArrowDown className="w-3 h-3" />}
                    <span>{change}</span>
                </div>
            </div>
        </motion.div>
    );
}
