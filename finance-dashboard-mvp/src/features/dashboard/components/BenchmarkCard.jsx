import React from 'react';
import { Users, Sparkles } from 'lucide-react';

/**
 * Tu lugar en el ranking (#59).
 *
 * Por ahora se muestra como "Próximamente" — el backend (endpoints + agregador)
 * está listo, pero el bucket exige ≥50 usuarios por (edad × zona × categoría)
 * para no leakear datos individuales. Hasta tener masa suficiente mostramos
 * un teaser y un opt-in informativo. Cuando los buckets se llenen, se puede
 * volver al flujo de opt-in funcional reactivando getBenchmarkPrefs/getMyBenchmark.
 */
export function BenchmarkCard() {
    return (
        <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 border border-blue-500/15">
            <div className="absolute top-3 right-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    Próximamente
                </span>
            </div>

            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-black text-zinc-900 dark:text-white">
                        Tu lugar en el ranking
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                        Vamos a comparar tu gasto vs. usuarios de tu edad y zona —
                        anónimo y agregado en grupos de al menos 50 personas. Lo activamos
                        cuando lleguemos a esa masa crítica.
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>Sumando usuarios beta · te avisamos cuando esté listo</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
