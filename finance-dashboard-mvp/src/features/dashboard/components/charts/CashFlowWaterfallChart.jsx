import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, PiggyBank, AlertTriangle, ArrowDown, Sparkles } from 'lucide-react';
import { formatCompactCurrency, formatCurrency } from '../../../../utils/formatters';
import { cn } from '../../../../lib/utils';

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full py-8 text-center bg-zinc-50/50 dark:bg-zinc-800/10 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800/50">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center mb-3 animate-pulse">
                <PiggyBank className="w-6 h-6 text-violet-500 dark:text-violet-400" />
            </div>
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Sin flujo de dinero registrado</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[260px]">
                Registrá ingresos y gastos para ver cómo se distribuye tu plata este período.
            </p>
        </div>
    );
}

export function CashFlowWaterfallChart({ data }) {
    const { income, expenses, savings, hasData } = useMemo(() => {
        if (!data || data.length === 0) {
            return { income: 0, expenses: 0, savings: 0, hasData: false };
        }
        const inc = Number(data.find(d => d.name === 'Ingresos')?.value || 0);
        const exp = Math.abs(Number(data.find(d => d.name === 'Gastos')?.value || 0));
        const sav = Number(data.find(d => d.name === 'Ahorro')?.value || 0);
        return {
            income: inc,
            expenses: exp,
            savings: sav,
            hasData: inc > 0 || exp > 0,
        };
    }, [data]);

    if (!hasData) return <EmptyState />;

    const isDeficit = savings < 0;
    const denominator = Math.max(income, expenses);

    const expensesPct = denominator > 0 ? (expenses / denominator) * 100 : 0;
    const savingsPct = denominator > 0 && !isDeficit ? (savings / denominator) * 100 : 0;
    const incomePct = denominator > 0 ? (income / denominator) * 100 : 0;

    const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
    const burnRate = income > 0 ? Math.round((expenses / income) * 100) : 0;

    return (
        <div className="h-full flex flex-col justify-between gap-4 py-1">
            {/* INGRESOS — barra completa de referencia */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 leading-none">Ingresos</p>
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-none mt-0.5">Lo que entró</p>
                        </div>
                    </div>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
                        {formatCompactCurrency(income)}
                    </span>
                </div>
                <div className="relative h-7 w-full bg-zinc-100 dark:bg-zinc-800/40 rounded-xl overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${incomePct}%` }}
                        transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-xl shadow-md shadow-emerald-500/30"
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-xl" />
                        <div className="absolute inset-y-0 right-2 flex items-center">
                            <span className="text-[10px] font-black text-white/90 tabular-nums">100%</span>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Flecha conectora */}
            <div className="flex items-center justify-center -my-1">
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.6 }}
                    className="flex items-center gap-2 px-3 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800/60 text-[9px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400"
                >
                    <ArrowDown className="w-2.5 h-2.5" />
                    Se distribuyó así
                    <ArrowDown className="w-2.5 h-2.5" />
                </motion.div>
            </div>

            {/* GASTOS */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-rose-500/10 dark:bg-rose-500/15 flex items-center justify-center">
                            <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400 leading-none">Gastos</p>
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-none mt-0.5">
                                {income > 0 ? `${burnRate}% de los ingresos` : 'Sin ingresos del período'}
                            </p>
                        </div>
                    </div>
                    <span className="text-lg font-black text-rose-600 dark:text-rose-400 tracking-tight tabular-nums">
                        −{formatCompactCurrency(expenses)}
                    </span>
                </div>
                <div className="relative h-7 w-full bg-zinc-100 dark:bg-zinc-800/40 rounded-xl overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(expensesPct, 100)}%` }}
                        transition={{ duration: 1, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
                        className={cn(
                            "absolute inset-y-0 left-0 rounded-xl shadow-md",
                            isDeficit
                                ? "bg-gradient-to-r from-rose-600 to-rose-500 shadow-rose-500/40"
                                : "bg-gradient-to-r from-rose-500 to-rose-400 shadow-rose-500/30"
                        )}
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-xl" />
                    </motion.div>
                </div>
            </div>

            {/* AHORRO */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center",
                            isDeficit ? "bg-amber-500/10 dark:bg-amber-500/15" : "bg-violet-500/10 dark:bg-violet-500/15"
                        )}>
                            {isDeficit
                                ? <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                : <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />}
                        </div>
                        <div>
                            <p className={cn(
                                "text-[10px] font-black uppercase tracking-widest leading-none",
                                isDeficit ? "text-amber-700 dark:text-amber-400" : "text-violet-700 dark:text-violet-400"
                            )}>
                                {isDeficit ? 'Déficit' : 'Ahorro'}
                            </p>
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-none mt-0.5">
                                {isDeficit
                                    ? 'Gastaste más de lo que entró'
                                    : income > 0
                                        ? `Tasa de ahorro: ${savingsRate}%`
                                        : 'Lo que te quedó'}
                            </p>
                        </div>
                    </div>
                    <span className={cn(
                        "text-lg font-black tracking-tight tabular-nums",
                        isDeficit ? "text-amber-600 dark:text-amber-400" : "text-violet-600 dark:text-violet-400"
                    )}>
                        {isDeficit ? '−' : '+'}{formatCompactCurrency(Math.abs(savings))}
                    </span>
                </div>
                <div className="relative h-7 w-full bg-zinc-100 dark:bg-zinc-800/40 rounded-xl overflow-hidden">
                    {isDeficit ? (
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(245,158,11,0.15)_6px,rgba(245,158,11,0.15)_12px)] rounded-xl flex items-center justify-center"
                        >
                            <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                                Saldo negativo
                            </span>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${savingsPct}%` }}
                            transition={{ duration: 1, delay: 0.5, ease: [0.23, 1, 0.32, 1] }}
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-violet-400 rounded-xl shadow-md shadow-violet-500/30"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-xl" />
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Footer summary */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.4 }}
                className={cn(
                    "rounded-xl px-3 py-2 flex items-center gap-2 text-[11px] font-medium border",
                    isDeficit
                        ? "bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-300"
                        : savingsRate >= 20
                            ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                            : "bg-zinc-100 dark:bg-zinc-800/40 border-zinc-200/50 dark:border-zinc-700/50 text-zinc-600 dark:text-zinc-300"
                )}
            >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>
                    {isDeficit
                        ? `Gastaste ${formatCurrency(expenses - income)} más de lo que entró este período.`
                        : savingsRate >= 20
                            ? `Excelente: estás guardando el ${savingsRate}% de tus ingresos.`
                            : income > 0
                                ? `Ahorrás ${savingsRate}%. La regla 50/30/20 sugiere al menos 20%.`
                                : `Registraste ${formatCurrency(expenses)} de gastos sin ingresos asociados.`}
                </span>
            </motion.div>
        </div>
    );
}
