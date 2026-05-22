import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { BTN_PRIMARY, BTN_SECONDARY, MOTION_CARD } from '../../../lib/formClasses';

const toneStyles = {
    neutral: {
        iconBg: 'bg-zinc-100 dark:bg-zinc-800',
        iconText: 'text-zinc-500 dark:text-zinc-400',
    },
    primary: {
        iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        iconText: 'text-emerald-600 dark:text-emerald-400',
    },
    warning: {
        iconBg: 'bg-amber-500/10 dark:bg-amber-500/15',
        iconText: 'text-amber-600 dark:text-amber-400',
    },
    info: {
        iconBg: 'bg-blue-500/10 dark:bg-blue-500/15',
        iconText: 'text-blue-600 dark:text-blue-400',
    },
    violet: {
        iconBg: 'bg-violet-500/10 dark:bg-violet-500/15',
        iconText: 'text-violet-600 dark:text-violet-400',
    },
    rose: {
        iconBg: 'bg-rose-500/10 dark:bg-rose-500/15',
        iconText: 'text-rose-600 dark:text-rose-400',
    },
};

/**
 * Empty state estándar para listas/secciones vacías.
 *
 * Variantes:
 * - variant="full" — empty state grande, ocupa todo el espacio (default)
 * - variant="compact" — empty state pequeño, para dentro de cards/charts
 */
export function EmptyState({
    icon: Icon = Wallet,
    title,
    description,
    tone = 'neutral',
    variant = 'full',
    actionLabel,
    onAction,
    actionTo,
    secondaryActionLabel,
    onSecondaryAction,
    secondaryActionTo,
    className,
}) {
    const styles = toneStyles[tone] || toneStyles.neutral;

    const isCompact = variant === 'compact';

    return (
        <motion.div
            {...MOTION_CARD}
            className={cn(
                "flex flex-col items-center justify-center text-center",
                isCompact
                    ? "py-8 px-4 bg-zinc-50/50 dark:bg-zinc-800/10 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800/50"
                    : "py-12 md:py-16 px-6 glass rounded-3xl",
                className
            )}
        >
            <div className={cn(
                "flex items-center justify-center rounded-2xl mb-4",
                isCompact ? "w-12 h-12" : "w-16 h-16 md:w-20 md:h-20",
                styles.iconBg,
                tone !== 'neutral' && "animate-pulse"
            )}>
                <Icon className={cn(
                    isCompact ? "w-6 h-6" : "w-8 h-8 md:w-10 md:h-10",
                    styles.iconText
                )} />
            </div>

            <h3 className={cn(
                "font-black text-zinc-900 dark:text-white tracking-tight",
                isCompact ? "text-sm" : "text-lg md:text-xl"
            )}>
                {title}
            </h3>

            {description && (
                <p className={cn(
                    "text-zinc-500 dark:text-zinc-400 font-medium mt-1.5 max-w-md",
                    isCompact ? "text-xs" : "text-sm"
                )}>
                    {description}
                </p>
            )}

            {(actionLabel || secondaryActionLabel) && (
                <div className={cn(
                    "flex flex-wrap items-center justify-center gap-2 mt-5",
                    isCompact && "mt-4"
                )}>
                    {actionLabel && (actionTo ? (
                        <Link to={actionTo} className={cn(BTN_PRIMARY, isCompact && "text-xs py-2 px-4")}>
                            {actionLabel}
                        </Link>
                    ) : (
                        <button type="button" onClick={onAction} className={cn(BTN_PRIMARY, isCompact && "text-xs py-2 px-4")}>
                            {actionLabel}
                        </button>
                    ))}
                    {secondaryActionLabel && (secondaryActionTo ? (
                        <Link to={secondaryActionTo} className={cn(BTN_SECONDARY, isCompact && "text-xs py-2 px-4")}>
                            {secondaryActionLabel}
                        </Link>
                    ) : (
                        <button type="button" onClick={onSecondaryAction} className={cn(BTN_SECONDARY, isCompact && "text-xs py-2 px-4")}>
                            {secondaryActionLabel}
                        </button>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
