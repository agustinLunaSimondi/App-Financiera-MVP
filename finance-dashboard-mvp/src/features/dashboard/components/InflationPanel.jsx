import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { getInflationContext } from '../../../services/api';

/**
 * Panel "Tu plata con inflación real".
 * Diferenciador clave vs. apps internacionales: muestra el gasto del mes en pesos,
 * convertido a USD blue, y comparado con el mes anterior ajustado por IPC.
 *
 * No hay equivalente en YNAB, Wallet, Spendee, Mobills, ni Ualá. Es específico AR.
 */
export function InflationPanel() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await getInflationContext();
                if (!cancelled) setData(res);
            } catch (e) {
                if (!cancelled) setError(e?.response?.data?.detail || 'No pudimos obtener el contexto de inflación');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    if (loading) {
        return (
            <div className="glass-card rounded-2xl p-6 animate-pulse">
                <div className="h-4 w-40 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
                <div className="h-8 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="glass-card rounded-2xl p-6 flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error || 'Sin datos macro disponibles'}</span>
            </div>
        );
    }

    const fmtARS = (n) => n != null
        ? n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
        : '—';
    const fmtUSD = (n) => n != null
        ? n.toLocaleString('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
        : '—';
    const fmtPct = (n) => n != null ? `${n > 0 ? '+' : ''}${n.toFixed(1)}%` : '—';

    const realVar = data.real_variation_pct;
    const realVarPositive = realVar != null && realVar > 0;
    const realVarNegative = realVar != null && realVar < 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="glass-card rounded-2xl overflow-hidden relative"
        >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-500" />
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-40 bg-gradient-to-br from-amber-500/30 to-transparent" />

            <div className="relative z-10 p-6 space-y-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
                            Tu plata con inflación real
                        </p>
                        <h3 className="mt-1 text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                            ¿A dónde se fue el vuelto?
                        </h3>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 shrink-0">
                        <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            Gasto del mes (ARS)
                        </p>
                        <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">
                            {fmtARS(data.expenses_month_ars)}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            En USD blue
                        </p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">
                            {fmtUSD(data.expenses_month_usd)}
                        </p>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                            Blue: {data.usd_blue ? `$${data.usd_blue.toFixed(0)}` : '—'}
                            {data.usd_oficial ? ` · Oficial: $${data.usd_oficial.toFixed(0)}` : ''}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            Variación real vs. mes anterior
                        </p>
                        <div className={`inline-flex items-center gap-1.5 text-lg font-black tracking-tight ${
                            realVarPositive ? 'text-rose-600 dark:text-rose-400'
                            : realVarNegative ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-zinc-500 dark:text-zinc-400'
                        }`}>
                            {realVarPositive && <TrendingUp className="w-4 h-4" />}
                            {realVarNegative && <TrendingDown className="w-4 h-4" />}
                            {fmtPct(realVar)}
                        </div>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                            IPC mes ref.: {data.ipc_last_month_pct != null ? `${data.ipc_last_month_pct.toFixed(1)}%` : '—'}
                        </p>
                    </div>
                </div>

                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                    {realVar == null
                        ? 'Cargá movimientos del mes anterior para ver tu variación ajustada por inflación.'
                        : realVarPositive
                            ? `Estás gastando ${realVar.toFixed(1)}% más que la inflación. La plata se te va más rápido que los precios.`
                            : realVarNegative
                                ? `Le estás ganando a la inflación por ${Math.abs(realVar).toFixed(1)}%. Vas bien.`
                                : 'Tus gastos se mueven al ritmo de la inflación.'}
                </p>
            </div>
        </motion.div>
    );
}
