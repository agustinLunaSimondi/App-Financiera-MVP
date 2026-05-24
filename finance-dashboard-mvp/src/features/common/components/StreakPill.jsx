import React, { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { getMyStreak } from '../../../services/api';
import { analytics } from '../../../services/analytics';

/**
 * Pill animado de streak (#62). Cuelga del sidebar. Si el endpoint falla
 * (offline / 401) el componente se ausenta silenciosamente.
 */
export function StreakPill() {
    const [data, setData] = useState(null);

    useEffect(() => {
        let cancelled = false;
        getMyStreak()
            .then((d) => {
                if (!cancelled) {
                    setData(d);
                    analytics.streakViewed({
                        currentStreak: d.currentStreak ?? 0,
                        hasBadge: (d.badges || []).length > 0,
                        longestStreak: d.longestStreak ?? 0,
                    });
                }
            })
            .catch(() => { /* silent */ });
        return () => { cancelled = true; };
    }, []);

    if (!data) return null;
    const current = data.currentStreak ?? 0;

    const next = data.nextBadge;
    return (
        <div className="px-4 py-3 rounded-2xl bg-gradient-to-br from-orange-500/10 to-rose-500/10 border border-orange-500/20">
            <div className="flex items-center gap-2">
                <motion.div
                    animate={current > 0 ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                >
                    <Flame className="w-5 h-5 text-orange-500" />
                </motion.div>
                <div className="flex-1">
                    <p className="text-sm font-black text-zinc-800 dark:text-zinc-100">
                        {current === 0
                            ? 'Empezá tu racha hoy'
                            : `${current} ${current === 1 ? 'día' : 'días'} sin gasto`}
                    </p>
                    {next ? (
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Faltan {next.days_to_unlock} para {next.label}
                        </p>
                    ) : (
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            ¡Top tier desbloqueado!
                        </p>
                    )}
                </div>
            </div>
            {(data.badges || []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                    {data.badges.map((b) => (
                        <span
                            key={b.key}
                            title={`Récord: ${data.longestStreak} días`}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-700 dark:text-orange-300 font-bold"
                        >
                            {b.label}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
