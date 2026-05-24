import React, { useEffect, useState } from 'react';
import { PiggyBank, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { getBudgetMode, updateBudgetMode, getEnvelopes } from '../../../services/api';

/**
 * Panel de modo "Chanchito" (#60).
 *
 * UX: lo llamamos "Modo Chanchito" porque la metáfora es nítida en castellano AR
 * — cada presupuesto es un chanchito mensual: cuando se llena, no entra más
 * plata adentro. Internamente el backend lo conoce como `budget_mode = 'envelopes'`
 * (referencia al sistema de envelopes/Dave Ramsey), pero al usuario solo le hablamos
 * de chanchitos para que se entienda sin contexto financiero.
 */
export function EnvelopesPanel() {
    const [mode, setMode] = useState(null);
    const [envelopes, setEnvelopes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const refresh = async () => {
        setLoading(true);
        try {
            const m = await getBudgetMode();
            const e = await getEnvelopes();
            setMode(m);
            setEnvelopes(e.envelopes || []);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);

    const toggleMode = async () => {
        const next = mode === 'envelopes' ? 'standard' : 'envelopes';
        setSaving(true);
        try {
            await updateBudgetMode(next);
            setMode(next);
            toast.success(next === 'envelopes' ? 'Modo Chanchito activado' : 'Modo estándar activado');
        } catch {
            toast.error('No pudimos cambiar el modo');
        } finally {
            setSaving(false);
        }
    };

    if (loading || mode === null) {
        return <div className="h-32 bg-zinc-100 dark:bg-zinc-800/40 rounded-2xl animate-pulse" />;
    }

    const isChanchito = mode === 'envelopes';

    return (
        <div className="rounded-3xl p-6 bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5 border border-violet-500/10">
            <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                        {isChanchito ? <Lock className="w-6 h-6 text-violet-500" /> : <PiggyBank className="w-6 h-6 text-violet-500" />}
                    </div>
                    <div>
                        <h3 className="font-black text-zinc-900 dark:text-white">
                            {isChanchito ? 'Modo Chanchito' : 'Modo estándar'}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-md">
                            {isChanchito
                                ? 'Cada categoría es un chanchito mensual. Cuando se llena, la app no te deja cargar más gastos ahí hasta el mes que viene.'
                                : 'Los presupuestos son sugerencias — podés excederte y solo te avisamos. Activá el Modo Chanchito si querés disciplina dura.'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={toggleMode}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-bold text-xs whitespace-nowrap disabled:opacity-50"
                >
                    {saving ? '...' : (isChanchito ? 'Pasar a estándar' : 'Activar Modo Chanchito')}
                </button>
            </div>

            {isChanchito && envelopes.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
                    {envelopes.map((env) => (
                        <EnvelopeChip key={env.categoryId} env={env} />
                    ))}
                </div>
            )}

            {isChanchito && envelopes.length === 0 && (
                <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                    Creá presupuestos mensuales para tener tus primeros chanchitos.
                </p>
            )}
        </div>
    );
}

function EnvelopeChip({ env }) {
    const pct = env.budget > 0 ? Math.min(100, Math.round((env.spent / env.budget) * 100)) : 0;
    const empty = env.isEmpty;
    return (
        <div className={`p-3 rounded-2xl border ${empty ? 'border-rose-500/30 bg-rose-500/5' : 'border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-800/40'}`}>
            <div className="flex items-center gap-2 mb-2">
                <PiggyBank
                    className="w-4 h-4"
                    style={{ color: empty ? '#f43f5e' : (env.categoryColor || '#8b5cf6') }}
                />
                <span className="text-xs font-black text-zinc-800 dark:text-zinc-100 truncate">
                    {env.categoryName}
                </span>
                {empty && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-black uppercase tracking-wider ml-auto">
                        Vacío
                    </span>
                )}
            </div>
            <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                    className={empty ? 'h-full bg-rose-500' : 'h-full bg-emerald-500'}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <p className="text-[10px] mt-1.5 text-zinc-500 dark:text-zinc-400">
                Resta ${Number(env.remaining).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
            </p>
        </div>
    );
}
