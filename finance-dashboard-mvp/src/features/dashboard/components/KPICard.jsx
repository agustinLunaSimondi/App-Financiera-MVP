import React from 'react';
import { Card } from '../../common/components/Card';
import { ArrowUp, ArrowDown, Wallet, PiggyBank, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';

const iconMap = {
    Wallet,
    PiggyBank,
    ArrowUpCircle,
    ArrowDownCircle
};

export function KPICard({ label, value, change, type, icon, delay = 0 }) {
    const Icon = (typeof icon === 'string' ? iconMap[icon] : icon) || Wallet;
    const isPositive = type === 'positive';
    const isNegative = type === 'negative';

    return (
        <Card className="p-0 border-none bg-zinc-900/5 dark:bg-white/5 backdrop-blur-none shadow-none hover:translate-y-0" delay={delay}>
            <div className="flex items-center justify-between p-4 group">
                <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400/70">{label}</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{value}</span>
                    </div>
                    <div className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors",
                        change.includes('+') ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                            change.includes('-') ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                                "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                    )}>
                        {change.includes('+') ? <ArrowUp className="w-3 h-3" /> : change.includes('-') ? <ArrowDown className="w-3 h-3" /> : null}
                        {change}
                    </div>
                </div>
                <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full group-hover:bg-emerald-500/30 transition-colors" />
                    <div className="relative p-4 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200/50 dark:border-zinc-700/30 group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                </div>
            </div>
        </Card>
    );
}
