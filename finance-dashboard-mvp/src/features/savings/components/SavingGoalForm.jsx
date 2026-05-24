import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

// Paleta unificada con BudgetForm — 10 colores curados para light + dark.
const COLOR_PRESETS = [
    '#10B981', // emerald
    '#3B82F6', // blue
    '#8B5CF6', // violet
    '#F59E0B', // amber
    '#EF4444', // red
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#14B8A6', // teal
    '#F97316', // orange
    '#64748B', // slate
];

export function SavingGoalForm({ goal, onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        name: '',
        targetAmount: '',
        currentAmount: '',
        deadline: '',
        color: '#10B981'
    });

    useEffect(() => {
        if (goal) {
            setFormData({
                name: goal.name || '',
                targetAmount: goal.targetAmount || '',
                currentAmount: goal.currentAmount || '',
                deadline: goal.deadline ? goal.deadline.split('T')[0] : '',
                color: goal.color || '#10B981'
            });
        } else {
            // Reset al estado limpio si se reabre el modal en modo "crear"
            // (sin esto, los datos de la última meta editada persisten).
            setFormData({
                name: '',
                targetAmount: '',
                currentAmount: '',
                deadline: '',
                color: '#10B981',
            });
        }
    }, [goal]);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Convertir strings vacíos a null/0 antes de enviar para evitar 422 de Pydantic
        const payload = {
            name: formData.name.trim(),
            color: formData.color,
            targetAmount: parseFloat(formData.targetAmount),
            currentAmount: formData.currentAmount === '' ? 0 : parseFloat(formData.currentAmount),
            // deadline es Optional[date] en backend; "" rompe la validación Pydantic
            deadline: formData.deadline ? formData.deadline : null
        };
        onSubmit(payload);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest text-[10px]">Nombre de la Meta</label>
                <input
                    type="text"
                    required
                    placeholder="Ej: Vacaciones 2026, Nuevo Coche..."
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest text-[10px]">Monto Objetivo</label>
                    <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={formData.targetAmount}
                        onChange={e => setFormData({ ...formData, targetAmount: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest text-[10px]">Monto Actual</label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={formData.currentAmount}
                        onChange={e => setFormData({ ...formData, currentAmount: e.target.value })}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest text-[10px]">Fecha Límite (Opcional)</label>
                <input
                    type="date"
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.deadline}
                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                />
            </div>

            <div className="space-y-3">
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest text-[10px]">Color Distintivo</label>
                <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((preset) => (
                        <button
                            key={preset}
                            type="button"
                            onClick={() => setFormData({ ...formData, color: preset })}
                            aria-label={`Color ${preset}`}
                            aria-pressed={formData.color === preset}
                            className="relative w-8 h-8 rounded-full transition-transform hover:scale-110 active:scale-95 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900"
                            style={{
                                backgroundColor: preset,
                                boxShadow: formData.color === preset ? `0 0 0 2px ${preset}` : undefined,
                            }}
                        >
                            {formData.color === preset && (
                                <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                            )}
                        </button>
                    ))}
                    <label className="relative w-8 h-8 rounded-full overflow-hidden cursor-pointer border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-emerald-500 transition-colors">
                        <input
                            type="color"
                            value={formData.color}
                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            aria-label="Color personalizado"
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-zinc-400">+</span>
                    </label>
                </div>
            </div>

            <div className="pt-4 flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95"
                >
                    {goal ? 'Actualizar Meta' : 'Añadir Meta'}
                </button>
            </div>
        </form>
    );
}
