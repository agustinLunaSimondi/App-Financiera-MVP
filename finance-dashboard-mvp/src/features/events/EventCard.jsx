import React from 'react';
import { motion } from 'framer-motion';
import { Users, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { cn } from '../../lib/utils';

export function EventCard({ event, onClick, delay = 0 }) {
    const closed = event.status === 'CLOSED';
    return (
        <motion.button
            type="button"
            onClick={onClick}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            className="group text-left glass-card rounded-2xl p-6 w-full hover:shadow-xl transition-all hover:-translate-y-0.5"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-3xl shrink-0">
                        {event.coverEmoji || '🎉'}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-black text-lg text-zinc-900 dark:text-white truncate">{event.name}</h3>
                        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" /> {event.memberCount}
                            </span>
                            {event.eventDate && (
                                <span>
                                    {new Date(event.eventDate + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-300 dark:text-zinc-600 group-hover:text-orange-500 transition-colors shrink-0" />
            </div>
            <div className="mt-5 flex items-end justify-between">
                <div>
                    <p className="text-[10px] uppercase tracking-widest font-black text-zinc-400">Total gastado</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white">
                        {formatCurrency(event.totalAmount, event.currency)}
                    </p>
                </div>
                <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg",
                    closed
                        ? "bg-zinc-400/15 text-zinc-500"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                )}>
                    {closed ? 'Cerrado' : 'Activo'}
                </span>
            </div>
        </motion.button>
    );
}
