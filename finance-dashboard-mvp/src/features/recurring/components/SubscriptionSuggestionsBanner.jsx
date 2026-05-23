import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, X, ChevronRight } from 'lucide-react';
import { Modal } from '../../common/components/Modal';
import { formatCompactCurrency, formatCurrency } from '../../../utils/formatters';
import { cn } from '../../../lib/utils';
import { BTN_PRIMARY } from '../../../lib/formClasses';
import { getRecurringSuggestions, createRecurringFromSuggestions } from '../../../services/api';
import { analytics } from '../../../services/analytics';
import { parseApiError } from '../../../lib/apiErrors';

/**
 * Banner + modal de detección de suscripciones (#61).
 *
 * Fetchea sugerencias al montar. Si hay >= 1, muestra el banner. El modal
 * permite seleccionar cuáles convertir en RecurringTransaction; las que no se
 * tildan no se crean. Default: todas seleccionadas (caso "Aceptar todo").
 */
export function SubscriptionSuggestionsBanner({ onSuggestionsConverted }) {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dismissed, setDismissed] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selected, setSelected] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await getRecurringSuggestions();
                if (cancelled) return;
                setSuggestions(data);
                setSelected(Object.fromEntries(data.map(s => [s.key, true])));
                if (data.length > 0) analytics.subscriptionsSuggestionViewed(data.length);
            } catch (err) {
                console.error('Error fetching subscription suggestions:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    if (loading || dismissed || suggestions.length === 0) return null;

    const totalMonthly = suggestions.reduce((sum, s) => sum + Math.abs(Number(s.averageAmount)), 0);

    const openModal = () => {
        setModalOpen(true);
        analytics.subscriptionsSuggestionEngaged(suggestions.length);
    };

    const toggleOne = (key) => setSelected(prev => ({ ...prev, [key]: !prev[key] }));

    const handleConfirm = async () => {
        const items = suggestions
            .filter(s => selected[s.key])
            .filter(s => s.categoryId && s.accountId)
            .map(s => ({
                sampleDescription: s.sampleDescription,
                averageAmount: Number(s.averageAmount),
                lastTransactionDate: s.lastTransactionDate,
                transactionIds: s.transactionIds,
                accountId: s.accountId,
                categoryId: s.categoryId,
                frequency: 'MONTHLY',
            }));

        if (items.length === 0) {
            toast.error('Tildá al menos una sugerencia con cuenta y categoría detectadas.');
            return;
        }

        setSubmitting(true);
        try {
            const result = await createRecurringFromSuggestions(items);
            analytics.subscriptionsSuggestionConverted(result.created.length);
            toast.success(`${result.created.length} ${result.created.length === 1 ? 'suscripción agregada' : 'suscripciones agregadas'}`);
            setModalOpen(false);
            setDismissed(true);
            onSuggestionsConverted?.();
        } catch (err) {
            console.error('Error converting suggestions:', err);
            toast.error(parseApiError(err, 'Error al convertir las sugerencias'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <div className="relative overflow-hidden rounded-3xl border border-emerald-400/40 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-blue-500/10 p-5 md:p-6 shadow-sm">
                <div className="absolute -right-20 -top-20 w-56 h-56 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
                <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    aria-label="Descartar sugerencias"
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-white/40 dark:hover:bg-zinc-800/40 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                            <Sparkles className="w-3 h-3 fill-current" /> Aki detectó
                        </div>
                        <h3 className="text-lg md:text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                            {suggestions.length} {suggestions.length === 1 ? 'gasto recurrente sin marcar' : 'gastos recurrentes sin marcar'}
                        </h3>
                        <p className="text-xs md:text-sm font-medium text-zinc-600 dark:text-zinc-300">
                            Total estimado: <strong>{formatCompactCurrency(totalMonthly)}/mes</strong>. Convertilas en recurrentes para no tener que registrarlas a mano cada vez.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={openModal}
                        className={cn(BTN_PRIMARY, 'w-full md:w-auto shrink-0')}
                    >
                        Revisar sugerencias
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <Modal isOpen={modalOpen} onClose={() => !submitting && setModalOpen(false)} title="Sugerencias de suscripciones">
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {suggestions.map(s => {
                        const isOn = !!selected[s.key];
                        const missingRefs = !s.categoryId || !s.accountId;
                        return (
                            <label
                                key={s.key}
                                className={cn(
                                    'flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-colors',
                                    isOn
                                        ? 'border-emerald-400/60 bg-emerald-500/5'
                                        : 'border-zinc-200 dark:border-zinc-700 bg-white/40 dark:bg-zinc-800/30',
                                    missingRefs && 'opacity-60 cursor-not-allowed'
                                )}
                            >
                                <input
                                    type="checkbox"
                                    className="mt-1 accent-emerald-500"
                                    checked={isOn}
                                    disabled={missingRefs}
                                    onChange={() => !missingRefs && toggleOne(s.key)}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                                            {s.sampleDescription}
                                        </p>
                                        <span className="text-sm font-black text-zinc-900 dark:text-white shrink-0">
                                            {formatCurrency(Math.abs(Number(s.averageAmount)))}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                        {s.occurrences} cargos · cada ~{Math.round(s.medianIntervalDays)} días
                                        {missingRefs && ' · falta categoría/cuenta detectable'}
                                    </p>
                                </div>
                            </label>
                        );
                    })}
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                        type="button"
                        onClick={() => setModalOpen(false)}
                        disabled={submitting}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={submitting}
                        className={cn(BTN_PRIMARY, 'flex-1')}
                    >
                        {submitting ? 'Creando…' : 'Convertir seleccionadas'}
                    </button>
                </div>
            </Modal>
        </>
    );
}
