import React from 'react';
import { Card } from '../../common/components/Card';
import { Trash2, Edit2, Calendar } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatCurrency } from '../../../utils/formatters';

export function RecurringTransactionCard({ rt, onEdit, onDelete, onToggle, delay = 0 }) {
    const frequencyLabels = {
        DAILY: 'Diario',
        WEEKLY: 'Semanal',
        BIWEEKLY: 'Quincenal',
        MONTHLY: 'Mensual',
        YEARLY: 'Anual'
    };

    return (
        <Card delay={delay} className="group overflow-hidden relative">
            <div className="space-y-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "w-2 h-2 rounded-full",
                                rt.isActive ? "bg-emerald-500" : "bg-zinc-400"
                            )} />
                            <h3 className="font-bold text-zinc-900 dark:text-white uppercase text-[10px] tracking-widest">
                                {frequencyLabels[rt.frequency] || rt.frequency}
                            </h3>
                        </div>
                        <p className="text-lg font-black text-zinc-900 dark:text-white line-clamp-1">{rt.description}</p>
                    </div>
                    <div className="flex gap-1 opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onEdit(rt)}
                            aria-label="Editar regla"
                            className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-colors"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onDelete(rt.id)}
                            aria-label="Eliminar regla"
                            className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-baseline gap-1 flex-wrap">
                    <span className={cn(
                        "text-2xl font-black",
                        rt.amount > 0 ? "text-emerald-500" : "text-zinc-900 dark:text-white"
                    )}>
                        {rt.amount > 0 ? '+' : ''}{formatCurrency(rt.amount)}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest ml-1 truncate">
                        {rt.account?.name || rt.account}
                    </span>
                </div>

                <div className="pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-3">
                    <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Próximo: {rt.nextDate ? new Date(rt.nextDate + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '—'}</span>
                        </div>
                        <button
                            onClick={() => onToggle(rt)}
                            className={cn(
                                "px-3 py-1 rounded-full border transition-all hover:scale-105 active:scale-95",
                                rt.isActive
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                    : "bg-zinc-100 border-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:border-zinc-700"
                            )}
                        >
                            {rt.isActive ? 'Activo' : 'Pausado'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Sutil gradiente de fondo al hacer hover */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
        </Card>
    );
}
