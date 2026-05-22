import React from 'react';
import { motion } from 'framer-motion';
import { Target, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatCompactCurrency } from '../../../../utils/formatters';
import { cn } from '../../../../lib/utils';

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full py-8 text-center bg-zinc-50/50 dark:bg-zinc-800/10 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800/50">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-3 animate-pulse">
                <Target className="w-6 h-6 text-blue-500 dark:text-blue-400" />
            </div>
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Sin presupuestos activos</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[210px]">
                Creá presupuestos por categoría para ver cuánto estás gastando vs. lo planeado.
            </p>
        </div>
    );
}

export function BudgetComparisonChart({ data }) {
    const isEmpty = !data || data.length === 0;
    if (isEmpty) return <EmptyState />;

    const items = [...data]
        .map(d => {
            const budget = Number(d.budget) || 0;
            const actual = Number(d.actual) || 0;
            const pct = budget > 0 ? (actual / budget) * 100 : 0;
            return { ...d, budget, actual, pct };
        })
        .sort((a, b) => b.pct - a.pct);

    return (
        <div className="h-full flex flex-col gap-3 overflow-y-auto pr-1 -mr-1">
            {items.map((item, idx) => {
                const exceeded = item.pct > 100;
                const warning = item.pct >= 80 && item.pct <= 100;
                const fillWidth = Math.min(item.pct, 100);

                const status = exceeded
                    ? { color: 'rose', label: 'Excedido', Icon: AlertCircle }
                    : warning
                        ? { color: 'amber', label: 'Cerca del límite', Icon: AlertCircle }
                        : { color: 'emerald', label: 'En curso', Icon: CheckCircle2 };

                const fillColor = exceeded ? 'bg-rose-500' : warning ? 'bg-amber-500' : 'bg-emerald-500';
                const fillGlow = exceeded ? 'shadow-rose-500/30' : warning ? 'shadow-amber-500/30' : 'shadow-emerald-500/30';
                const textColor = exceeded ? 'text-rose-600 dark:text-rose-400' : warning ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';

                return (
                    <motion.div
                        key={item.category}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: idx * 0.06, ease: 'easeOut' }}
                        className="group"
                    >
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                    {item.category}
                                </span>
                                <span className={cn("text-[10px] font-black", textColor)}>
                                    {Math.round(item.pct)}%
                                </span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 shrink-0">
                                <span className="text-zinc-900 dark:text-white">{formatCompactCurrency(item.actual)}</span>
                                <span className="text-zinc-300 dark:text-zinc-600">/</span>
                                <span>{formatCompactCurrency(item.budget)}</span>
                            </div>
                        </div>

                        <div className="relative h-2.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${fillWidth}%` }}
                                transition={{ duration: 0.9, delay: idx * 0.06 + 0.2, ease: 'easeOut' }}
                                className={cn("absolute top-0 left-0 h-full rounded-full shadow-md", fillColor, fillGlow)}
                            />
                            {exceeded && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: idx * 0.06 + 1, duration: 0.4 }}
                                    className="absolute top-0 right-0 h-full w-1 bg-rose-700 dark:bg-rose-300 animate-pulse"
                                />
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-1.5">
                            <status.Icon className={cn("w-3 h-3", textColor)} />
                            <span className={cn("text-[10px] font-bold", textColor)}>
                                {status.label}
                            </span>
                            {!exceeded && (
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 ml-auto">
                                    Restan {formatCompactCurrency(Math.max(0, item.budget - item.actual))}
                                </span>
                            )}
                            {exceeded && (
                                <span className="text-[10px] text-rose-500 ml-auto font-bold">
                                    +{formatCompactCurrency(item.actual - item.budget)}
                                </span>
                            )}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
