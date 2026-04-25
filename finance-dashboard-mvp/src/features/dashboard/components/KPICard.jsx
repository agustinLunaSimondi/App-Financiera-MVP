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
        <Card className="p-0 border-none bg-white dark:bg-zinc-800/20 glass shadow-none hover:shadow-2xl hover:shadow-emerald-500/10" delay={delay}>
            <div className="flex items-center justify-between p-6 group h-full relative overflow-hidden">
                {/* Background Accent */}
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-500/10 blur-3xl rounded-full" />
                
                <div className="space-y-3 relative z-10">
                    <div className="flex items-center gap-2">
                         <div className="p-2 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-lg">
                            <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 dark:text-zinc-500">{label}</p>
                    </div>
                    
                    <div className="space-y-1">
                        <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter block">{value}</span>
                        <div className={cn(
                            "inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-lg transition-colors",
                            change.includes('+') ? "text-emerald-600 dark:text-emerald-400" :
                                change.includes('-') ? "text-rose-600 dark:text-rose-400" :
                                    "text-zinc-500 dark:text-zinc-500"
                        )}>
                            {change.includes('+') ? <ArrowUp className="w-3.5 h-3.5" /> : change.includes('-') ? <ArrowDown className="w-3.5 h-3.5" /> : null}
                            <span className="ml-0.5">{change}</span>
                        </div>
                    </div>
                </div>
                
                <div className="relative z-10 w-12 h-12 flex items-center justify-center">
                    <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-800 rounded-full group-hover:scale-125 transition-transform duration-500" />
                    <Icon className="w-6 h-6 text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-500 transition-colors" />
                </div>
            </div>
        </Card>
    );
}
