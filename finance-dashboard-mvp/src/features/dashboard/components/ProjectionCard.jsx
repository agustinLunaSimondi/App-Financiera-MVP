import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { formatCompactCurrency, formatPercentage } from '../../../utils/formatters';
import { cn } from '../../../lib/utils';
import { analytics } from '../../../services/analytics';

/**
 * KPI de proyección de gasto fin de mes (#54).
 *
 * Render condicional: solo se muestra si hay al menos un gasto en el mes actual
 * y al menos un día transcurrido. Si la proyección supera el budget total
 * mensual, vira a tono naranja con icono de alerta.
 */
export function ProjectionCard({ projectionData, monthlyBudgetTotal, historicalAverage }) {
    const viewedOnce = useRef(false);
    const exceedsBudget = monthlyBudgetTotal > 0 && projectionData.projection > monthlyBudgetTotal;

    useEffect(() => {
        if (viewedOnce.current) return;
        viewedOnce.current = true;
        analytics.projectionViewed({
            exceedsBudget,
            daysElapsed: projectionData.daysElapsed,
        });
    }, [exceedsBudget, projectionData.daysElapsed]);

    if (!projectionData || projectionData.spentToDate === 0) return null;

    const { projection, spentToDate, daysElapsed, daysInMonth } = projectionData;

    const vsAverageDelta = historicalAverage && historicalAverage > 0
        ? ((projection - historicalAverage) / historicalAverage) * 100
        : null;

    const tone = exceedsBudget ? 'amber' : 'blue';
    const tones = {
        amber: {
            ring: 'border-amber-400/50 dark:border-amber-500/30',
            iconWrap: 'bg-amber-500/15 dark:bg-amber-500/20',
            iconColor: 'text-amber-600 dark:text-amber-400',
            kicker: 'text-amber-700 dark:text-amber-400',
            accent: 'bg-amber-500',
            glow: 'from-amber-500/30 to-transparent',
        },
        blue: {
            ring: 'border-zinc-200/50 dark:border-zinc-700/50',
            iconWrap: 'bg-blue-500/10 dark:bg-blue-500/20',
            iconColor: 'text-blue-600 dark:text-blue-400',
            kicker: 'text-blue-700 dark:text-blue-400',
            accent: 'bg-blue-500',
            glow: 'from-blue-500/25 to-transparent',
        },
    };
    const colors = tones[tone];

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className={cn(
                'glass-card relative overflow-hidden rounded-3xl border p-6 md:p-7 shadow-sm',
                colors.ring
            )}
        >
            <div className={cn('absolute top-0 left-0 right-0 h-0.5', colors.accent)} />
            <div className={cn(
                'absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl opacity-60 bg-gradient-to-br',
                colors.glow
            )} />

            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className={cn('p-2 rounded-xl', colors.iconWrap)}>
                            {exceedsBudget
                                ? <AlertTriangle className={cn('w-4 h-4', colors.iconColor)} />
                                : <TrendingUp className={cn('w-4 h-4', colors.iconColor)} />
                            }
                        </div>
                        <span className={cn('text-[10px] font-black uppercase tracking-[0.14em]', colors.kicker)}>
                            Proyección fin de mes
                        </span>
                    </div>

                    <div className="space-y-1">
                        <p className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">
                            {formatCompactCurrency(projection)}
                        </p>
                        <p className="text-xs md:text-sm font-medium text-zinc-500 dark:text-zinc-400">
                            A día <strong className="text-zinc-700 dark:text-zinc-200">{daysElapsed}</strong> ya gastaste{' '}
                            <strong className="text-zinc-700 dark:text-zinc-200">{formatCompactCurrency(spentToDate)}</strong>
                            {monthlyBudgetTotal > 0 && (
                                <> de <strong className="text-zinc-700 dark:text-zinc-200">{formatCompactCurrency(monthlyBudgetTotal)}</strong> de presupuesto</>
                            )}.
                            Si seguís a este ritmo, cerrás el mes en <strong className={cn(exceedsBudget ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-700 dark:text-zinc-200')}>
                                {formatCompactCurrency(projection)}
                            </strong>.
                        </p>
                        {vsAverageDelta !== null && (
                            <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                                {vsAverageDelta >= 0 ? '+' : '−'}{formatPercentage(Math.abs(vsAverageDelta))} vs. tu promedio histórico
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50">
                        <Calendar className="w-3.5 h-3.5" />
                        Día {daysElapsed} de {daysInMonth}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
