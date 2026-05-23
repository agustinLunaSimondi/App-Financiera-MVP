import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { Modal } from '../../common/components/Modal';
import { useFinance } from '../../../hooks/useFinance';
import { getAutoCategorizeSuggestions, acceptCategorizations } from '../../../services/api';
import { BTN_PRIMARY } from '../../../lib/formClasses';
import { cn } from '../../../lib/utils';
import { parseApiError } from '../../../lib/apiErrors';

/**
 * Modal de auto-categorización (#55). Pide sugerencias al backend (Gemini
 * embeddings), muestra una lista con checkbox por sugerencia, y aplica las
 * tildadas en bloque. Si el endpoint no devuelve nada, muestra estado vacío.
 */
export function AutoCategorizeModal({ isOpen, onClose, onApplied }) {
    const { categories } = useFinance();
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [selected, setSelected] = useState({});
    const [applying, setApplying] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        setSuggestions([]);
        setSelected({});
        getAutoCategorizeSuggestions()
            .then(list => {
                setSuggestions(list);
                setSelected(Object.fromEntries(list.map(s => [s.transactionId, true])));
            })
            .catch(err => toast.error(parseApiError(err, 'Error al pedir sugerencias')))
            .finally(() => setLoading(false));
    }, [isOpen]);

    const catName = (id) => categories.find(c => c.id === id)?.name || id;

    const apply = async () => {
        const items = suggestions
            .filter(s => selected[s.transactionId])
            .map(s => ({ transactionId: s.transactionId, categoryId: s.suggestedCategoryId }));
        if (items.length === 0) {
            toast.error('Tildá al menos una sugerencia.');
            return;
        }
        setApplying(true);
        try {
            const updated = await acceptCategorizations(items);
            toast.success(`${updated} ${updated === 1 ? 'transacción recategorizada' : 'transacciones recategorizadas'}`);
            onApplied?.();
            onClose();
        } catch (err) {
            toast.error(parseApiError(err, 'No se pudo aplicar'));
        } finally {
            setApplying(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={() => !applying && onClose()} title="Aki sugiere categorías">
            <div className="space-y-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Encontramos transacciones que probablemente correspondan a otra categoría según tus
                    patrones históricos. Tildá las que querés mover.
                </p>

                {loading ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map(n => (
                            <div key={n} className="h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
                        ))}
                    </div>
                ) : suggestions.length === 0 ? (
                    <div className="py-10 text-center text-xs text-zinc-400">
                        No hay sugerencias por ahora. Cuando tengas más transacciones categorizadas, Aki podrá identificar patrones.
                    </div>
                ) : (
                    <ul className="space-y-2 max-h-[55vh] overflow-y-auto">
                        {suggestions.map(s => {
                            const on = !!selected[s.transactionId];
                            return (
                                <label
                                    key={s.transactionId}
                                    className={cn(
                                        'flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-colors',
                                        on
                                            ? 'border-emerald-400/60 bg-emerald-500/5'
                                            : 'border-zinc-200 dark:border-zinc-700'
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        className="mt-1 accent-emerald-500"
                                        checked={on}
                                        onChange={() => setSelected(p => ({ ...p, [s.transactionId]: !p[s.transactionId] }))}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                                            {s.sampleDescription}
                                        </p>
                                        <p className="text-[11px] text-zinc-500 mt-0.5">
                                            Sugerida: <strong className="text-emerald-700 dark:text-emerald-400">{catName(s.suggestedCategoryId)}</strong>
                                            {' · '}
                                            <span className="text-zinc-400">confianza {Math.round(s.confidence * 100)}%</span>
                                        </p>
                                    </div>
                                </label>
                            );
                        })}
                    </ul>
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={applying}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={apply}
                        disabled={applying || suggestions.length === 0}
                        className={cn(BTN_PRIMARY, 'flex-1')}
                    >
                        <Sparkles className="w-4 h-4" />
                        {applying ? 'Aplicando…' : 'Aplicar seleccionadas'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
