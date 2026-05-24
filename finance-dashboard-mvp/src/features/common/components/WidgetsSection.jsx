import React, { useEffect, useState } from 'react';
import { Code, Copy, RefreshCw, Trash2, Plus, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
    listWidgets, createWidget, deleteWidget, rotateWidgetToken,
    getSavingsGoals,
} from '../../../services/api';

/**
 * Sección "Widgets embebibles" (#64).
 * Permite generar/listar widgets públicos para embeber en Notion, blogs, etc.
 */
export function WidgetsSection() {
    const [widgets, setWidgets] = useState([]);
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [type, setType] = useState('balance');
    const [goalId, setGoalId] = useState('');

    const refresh = async () => {
        setLoading(true);
        try {
            const [w, g] = await Promise.all([listWidgets(), getSavingsGoals()]);
            setWidgets(w);
            setGoals(g);
            if (g.length > 0 && !goalId) setGoalId(g[0].id);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);

    const handleCreate = async () => {
        try {
            const config = type === 'goal' ? { goalId } : {};
            await createWidget({ type, config });
            toast.success('Widget creado');
            refresh();
        } catch {
            toast.error('No pudimos crear el widget');
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteWidget(id);
            toast.success('Widget eliminado');
            setWidgets((prev) => prev.filter((w) => w.id !== id));
        } catch {
            toast.error('No pudimos eliminar el widget');
        }
    };

    const handleRotate = async (id) => {
        try {
            const updated = await rotateWidgetToken(id);
            setWidgets((prev) => prev.map((w) => (w.id === id ? updated : w)));
            toast.success('Token rotado — actualizá los embeds');
        } catch {
            toast.error('No pudimos rotar el token');
        }
    };

    const embedSnippet = (token) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        return `<iframe src="${origin}/widget/${token}" width="320" height="180" frameborder="0" style="border-radius:16px"></iframe>`;
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(
            () => toast.success('Copiado al portapapeles'),
            () => toast.error('No pudimos copiar')
        );
    };

    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
                <Code className="w-5 h-5 text-zinc-500" />
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Widgets embebibles
                </h3>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                Generá un widget público con tu balance, una meta o el gasto del mes para
                embeber en Notion, tu blog o cualquier sitio. Sin login.
            </p>

            {/* Form de creación */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40">
                <label className="text-xs font-bold text-zinc-500">
                    Tipo
                    <select value={type} onChange={(e) => setType(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-sm font-normal">
                        <option value="balance">Balance total</option>
                        <option value="goal">Progreso de meta</option>
                        <option value="month_spend">Gasto del mes</option>
                    </select>
                </label>
                {type === 'goal' && (
                    <label className="text-xs font-bold text-zinc-500">
                        Meta
                        <select value={goalId} onChange={(e) => setGoalId(e.target.value)}
                            className="mt-1 w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-sm font-normal">
                            {goals.length === 0 && <option value="">Sin metas</option>}
                            {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </label>
                )}
                <div className="flex items-end">
                    <button
                        onClick={handleCreate}
                        disabled={type === 'goal' && !goalId}
                        className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Crear widget
                    </button>
                </div>
            </div>

            {/* Lista */}
            {loading ? (
                <div className="h-20 bg-zinc-100 dark:bg-zinc-800/40 rounded-xl animate-pulse" />
            ) : widgets.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-4">Todavía no creaste widgets.</p>
            ) : (
                <div className="space-y-3">
                    {widgets.map((w) => (
                        <div key={w.id} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div>
                                    <span className="text-[10px] uppercase tracking-widest font-black text-zinc-400">
                                        {w.type.replace('_', ' ')}
                                    </span>
                                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 break-all">
                                        Token: <code className="font-mono text-xs">{w.token.slice(0, 12)}…</code>
                                    </p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <a
                                        href={w.embedUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500"
                                        title="Abrir vista pública"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                    <button
                                        onClick={() => handleRotate(w.id)}
                                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500"
                                        title="Rotar token"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(w.id)}
                                        className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg text-rose-500"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="relative">
                                <textarea
                                    readOnly
                                    rows={2}
                                    value={embedSnippet(w.token)}
                                    className="w-full text-[11px] font-mono bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 text-zinc-700 dark:text-zinc-300"
                                />
                                <button
                                    onClick={() => copyToClipboard(embedSnippet(w.token))}
                                    className="absolute top-2 right-2 p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-500 hover:text-emerald-500"
                                    title="Copiar"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
