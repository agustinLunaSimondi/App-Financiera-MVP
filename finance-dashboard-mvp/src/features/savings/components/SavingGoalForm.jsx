import React, { useState, useEffect } from 'react';

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

    const colors = [
        '#10B981', // Emerald
        '#3B82F6', // Blue
        '#8B5CF6', // Violet
        '#F59E0B', // Amber
        '#EF4444', // Red
        '#EC4899', // Pink
    ];

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
                <div className="flex gap-3">
                    {colors.map(c => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setFormData({ ...formData, color: c })}
                            className={`w-8 h-8 rounded-full border-2 transition-transform ${formData.color === c ? 'scale-125 border-zinc-900 dark:border-white' : 'border-transparent hover:scale-110'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
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
