import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Power, PowerOff, Zap } from 'lucide-react';
import { Modal } from '../../common/components/Modal';
import { useFinance } from '../../../hooks/useFinance';
import { getGoalRules, createGoalRule, updateGoalRule, deleteGoalRule } from '../../../services/api';
import { formatCurrency } from '../../../utils/formatters';
import { parseApiError } from '../../../lib/apiErrors';
import { BTN_PRIMARY, INPUT_CLS, SELECT_CLS, LABEL_CLS } from '../../../lib/formClasses';
import { cn } from '../../../lib/utils';

/**
 * Modal de reglas de auto-depósito por meta (#56).
 *
 * Cada vez que entra una transacción en la categoría trigger (ingreso > 0), el
 * backend deposita automáticamente % o monto fijo en esta meta. Las reglas son
 * de tipo "porcentaje" o "monto fijo" — UI fuerza uno solo.
 */
export function GoalRulesModal({ goal, isOpen, onClose }) {
    const { categories } = useFinance();
    const incomeCategories = categories.filter(c => (c.type || '').toUpperCase() === 'INCOME');

    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);

    // Form state for new rule
    const [triggerCat, setTriggerCat] = useState('');
    const [mode, setMode] = useState('percentage'); // 'percentage' | 'fixed'
    const [percentage, setPercentage] = useState('10');
    const [fixedAmount, setFixedAmount] = useState('');

    useEffect(() => {
        if (!isOpen || !goal) return;
        setLoading(true);
        getGoalRules(goal.id)
            .then(setRules)
            .catch((e) => toast.error(parseApiError(e, 'No se pudieron cargar las reglas')))
            .finally(() => setLoading(false));
    }, [isOpen, goal]);

    useEffect(() => {
        if (!isOpen) return;
        setTriggerCat(incomeCategories[0]?.id || '');
        setMode('percentage');
        setPercentage('10');
        setFixedAmount('');
    }, [isOpen, incomeCategories.length]);

    if (!goal) return null;

    const submit = async () => {
        if (!triggerCat) {
            toast.error('Elegí una categoría de ingreso como trigger');
            return;
        }
        const payload = {
            triggerCategoryId: triggerCat,
            percentage: mode === 'percentage' ? parseFloat(percentage) : null,
            fixedAmount: mode === 'fixed' ? parseFloat(fixedAmount) : null,
            isActive: true,
        };
        if (mode === 'percentage' && !(payload.percentage > 0 && payload.percentage <= 100)) {
            toast.error('El porcentaje debe estar entre 0 y 100');
            return;
        }
        if (mode === 'fixed' && !(payload.fixedAmount > 0)) {
            toast.error('Ingresá un monto fijo positivo');
            return;
        }
        setAdding(true);
        try {
            const created = await createGoalRule(goal.id, payload);
            setRules(prev => [...prev, created]);
            toast.success('Regla creada');
            setPercentage('10');
            setFixedAmount('');
        } catch (err) {
            toast.error(parseApiError(err, 'No se pudo crear la regla'));
        } finally {
            setAdding(false);
        }
    };

    const toggleActive = async (rule) => {
        try {
            const updated = await updateGoalRule(goal.id, rule.id, { isActive: !rule.isActive });
            setRules(prev => prev.map(r => r.id === rule.id ? updated : r));
        } catch (err) {
            toast.error(parseApiError(err, 'No se pudo actualizar la regla'));
        }
    };

    const removeRule = async (rule) => {
        try {
            await deleteGoalRule(goal.id, rule.id);
            setRules(prev => prev.filter(r => r.id !== rule.id));
        } catch (err) {
            toast.error(parseApiError(err, 'No se pudo eliminar la regla'));
        }
    };

    const catName = (id) => categories.find(c => c.id === id)?.name || 'Categoría';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Reglas — ${goal.name}`}>
            <div className="space-y-5">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Cuando entre una transacción en la categoría que elijas, se va a depositar
                    automáticamente un % o un monto fijo en esta meta.
                </p>

                {/* Listado */}
                {loading ? (
                    <div className="h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
                ) : rules.length === 0 ? (
                    <div className="text-xs text-zinc-400 italic">Sin reglas todavía.</div>
                ) : (
                    <ul className="space-y-2">
                        {rules.map(r => (
                            <li key={r.id} className={cn(
                                'flex items-center justify-between gap-3 p-3 rounded-2xl border',
                                r.isActive
                                    ? 'border-emerald-400/40 bg-emerald-500/5'
                                    : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 opacity-70'
                            )}>
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <Zap className={cn('w-4 h-4 shrink-0', r.isActive ? 'text-emerald-500' : 'text-zinc-400')} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                                            {catName(r.triggerCategoryId)}
                                        </p>
                                        <p className="text-[11px] text-zinc-500">
                                            {r.percentage != null
                                                ? `${r.percentage}% del ingreso`
                                                : `${formatCurrency(r.fixedAmount)} fijo`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => toggleActive(r)}
                                        aria-label={r.isActive ? 'Pausar regla' : 'Activar regla'}
                                        className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    >
                                        {r.isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeRule(r)}
                                        aria-label="Eliminar regla"
                                        className="p-2 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Form */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500">Nueva regla</h4>
                    <div>
                        <label className={LABEL_CLS}>Cuando reciba ingreso en</label>
                        <select
                            value={triggerCat}
                            onChange={(e) => setTriggerCat(e.target.value)}
                            className={SELECT_CLS}
                        >
                            <option value="">Elegí una categoría…</option>
                            {incomeCategories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        {incomeCategories.length === 0 && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                                No tenés categorías de ingreso. Creá una desde Categorías primero.
                            </p>
                        )}
                    </div>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 self-start">
                        {[
                            { id: 'percentage', label: 'Porcentaje' },
                            { id: 'fixed', label: 'Monto fijo' },
                        ].map(o => (
                            <button
                                key={o.id}
                                type="button"
                                onClick={() => setMode(o.id)}
                                className={cn(
                                    'flex-1 px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all',
                                    mode === o.id
                                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                                        : 'text-zinc-500'
                                )}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>
                    {mode === 'percentage' ? (
                        <div>
                            <label className={LABEL_CLS}>% del ingreso a depositar</label>
                            <input
                                type="number"
                                inputMode="decimal"
                                min="0.1"
                                max="100"
                                step="0.1"
                                value={percentage}
                                onChange={(e) => setPercentage(e.target.value)}
                                className={INPUT_CLS}
                                placeholder="10"
                            />
                        </div>
                    ) : (
                        <div>
                            <label className={LABEL_CLS}>Monto fijo a depositar</label>
                            <input
                                type="number"
                                inputMode="decimal"
                                min="0.01"
                                step="0.01"
                                value={fixedAmount}
                                onChange={(e) => setFixedAmount(e.target.value)}
                                className={INPUT_CLS}
                                placeholder="25000"
                            />
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={submit}
                        disabled={adding || !triggerCat}
                        className={cn(BTN_PRIMARY, 'w-full')}
                    >
                        <Plus className="w-4 h-4" />
                        {adding ? 'Guardando…' : 'Agregar regla'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
