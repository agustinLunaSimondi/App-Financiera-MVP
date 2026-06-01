import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export function SettlementsSummary({ event }) {
    const settlements = event.settlements || [];

    if (settlements.length === 0) {
        return (
            <div className="glass-card rounded-2xl p-8 flex flex-col items-center text-center gap-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                <p className="font-bold text-zinc-900 dark:text-white">¡Todo saldado!</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No hay transferencias pendientes entre los miembros.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Transferencias mínimas para saldar el evento:
            </p>
            {settlements.map((s, i) => (
                <div key={`${s.fromMemberId}-${s.toMemberId}-${i}`} className="glass-card rounded-2xl px-5 py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white min-w-0">
                        <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 truncate max-w-[35vw]">{s.fromMemberName}</span>
                        <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 truncate max-w-[35vw]">{s.toMemberName}</span>
                    </div>
                    <span className="font-black text-zinc-900 dark:text-white shrink-0">{formatCurrency(s.amount, event.currency)}</span>
                </div>
            ))}
        </div>
    );
}
