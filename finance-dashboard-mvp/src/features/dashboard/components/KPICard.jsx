import React from 'react';
import { Card } from '../../common/components/Card';
import { ArrowUp, ArrowDown, Wallet } from 'lucide-react';
import { cn } from '../../../lib/utils';

const schemes = {
    blue: {
        badge: 'bg-blue-500/10 dark:bg-blue-500/20',
        icon: 'text-blue-600 dark:text-blue-400',
        glow: 'from-blue-500/20 to-blue-500/0',
        accent: 'bg-blue-500',
        soft: 'bg-blue-50 dark:bg-blue-500/10',
    },
    emerald: {
        badge: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        icon: 'text-emerald-600 dark:text-emerald-400',
        glow: 'from-emerald-500/20 to-emerald-500/0',
        accent: 'bg-emerald-500',
        soft: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    rose: {
        badge: 'bg-rose-500/10 dark:bg-rose-500/20',
        icon: 'text-rose-600 dark:text-rose-400',
        glow: 'from-rose-500/20 to-rose-500/0',
        accent: 'bg-rose-500',
        soft: 'bg-rose-50 dark:bg-rose-500/10',
    },
    violet: {
        badge: 'bg-violet-500/10 dark:bg-violet-500/20',
        icon: 'text-violet-600 dark:text-violet-400',
        glow: 'from-violet-500/20 to-violet-500/0',
        accent: 'bg-violet-500',
        soft: 'bg-violet-50 dark:bg-violet-500/10',
    },
    amber: {
        badge: 'bg-amber-500/10 dark:bg-amber-500/20',
        icon: 'text-amber-600 dark:text-amber-400',
        glow: 'from-amber-500/20 to-amber-500/0',
        accent: 'bg-amber-500',
        soft: 'bg-amber-50 dark:bg-amber-500/10',
    },
};

export function KPICard({ label, value, change, icon, scheme = 'emerald', delay = 0 }) {
    const Icon = icon || Wallet;
    const colors = schemes[scheme] || schemes.emerald;

    const isNegative = change.includes('-') || change.includes('↓');
    const isPositive = change.includes('+');

    return (
        <Card className="p-0 border-none bg-white dark:bg-zinc-800/30 glass shadow-sm hover:shadow-xl hover:shadow-zinc-200/60 dark:hover:shadow-zinc-900/60 transition-shadow" delay={delay}>
            <div className="relative overflow-hidden rounded-2xl">
                {/* Top accent bar */}
                <div className={cn("absolute top-0 left-0 right-0 h-0.5", colors.accent)} />

                {/* Glow background decoration */}
                <div className={cn("absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl opacity-70 bg-gradient-to-br", colors.glow)} />

                <div className="relative z-10 p-6 space-y-4">
                    {/* Icon + Label */}
                    <div className="flex items-center justify-between">
                        <div className={cn("p-2.5 rounded-xl", colors.badge)}>
                            <Icon className={cn("w-5 h-5", colors.icon)} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500 text-right">
                            {label}
                        </p>
                    </div>

                    {/* Value */}
                    <div>
                        <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter block leading-none">
                            {value}
                        </span>
                    </div>

                    {/* Change badge */}
                    <div className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg",
                        change === '--'
                            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
                            : isNegative
                                ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                : isPositive
                                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : cn(colors.soft, colors.icon)
                    )}>
                        {isPositive && <ArrowUp className="w-3 h-3" />}
                        {isNegative && <ArrowDown className="w-3 h-3" />}
                        <span>{change}</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}
