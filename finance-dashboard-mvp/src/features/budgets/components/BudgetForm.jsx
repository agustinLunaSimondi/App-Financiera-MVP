import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

// Paleta de 10 colores cuidados para que se vea bien en light + dark.
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

export function BudgetForm({ onSubmit, onCancel, initialData = null, categories = [] }) {
    const [formData, setFormData] = useState({
        categoryId: '',
        amount: '',
        period: 'MONTHLY',
        startDate: new Date().toISOString().split('T')[0],
        color: COLOR_PRESETS[0],
        isStrict: false,
    });

    useEffect(() => {
        if (initialData) {
            const catId = initialData.category?.id || initialData.categoryId;
            setFormData({
                categoryId: catId || '',
                amount: initialData.amount,
                period: initialData.period || 'MONTHLY',
                startDate: initialData.startDate ? initialData.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
                color: initialData.color || COLOR_PRESETS[0],
                isStrict: initialData.isStrict || false,
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            amount: parseFloat(formData.amount),
            color: formData.color,
        });
    };

    // Filtrar categorías que sean de GASTO (EXPENSE) solamente, ya que los presupuestos suelen ser para gastos
    // La comparación es case-insensitive para cubrir distintas serializaciones del enum (EXPENSE / expense)
    const expenseCategories = categories.filter(c =>
        typeof c.type === 'string'
            ? c.type.toUpperCase() === 'EXPENSE'
            : c.type === 'EXPENSE'
    );
    // Si por alguna razón no hay categorías de gasto, mostrar todas como fallback
    const categoryOptions = expenseCategories.length > 0 ? expenseCategories : categories;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {initialData ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
                </h3>
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Categoría
                </label>
                <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-colors"
                >
                    <option value="">
                        {categories.length === 0
                            ? 'Sin categorías de gasto — creá una en Configuración'
                            : 'Selecciona una categoría'}
                    </option>
                    {categoryOptions.map(cat => (
                        <option key={cat.id} value={cat.id}>
                            {cat.name}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Monto Límite
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        required
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-colors"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Periodo
                    </label>
                    <select
                        name="period"
                        value={formData.period}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-colors"
                    >
                        <option value="MONTHLY">Mensual</option>
                        <option value="WEEKLY">Semanal</option>
                        <option value="YEARLY">Anual</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Fecha Inicio
                    </label>
                    <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-colors"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Color
                </label>
                <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((preset) => (
                        <button
                            key={preset}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, color: preset }))}
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
                            onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            aria-label="Color personalizado"
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-zinc-400">+</span>
                    </label>
                </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <input
                    id="budget-is-strict"
                    type="checkbox"
                    checked={formData.isStrict}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isStrict: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-emerald-600 cursor-pointer"
                />
                <label htmlFor="budget-is-strict" className="text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                    <span className="font-medium">🐷 Modo chanchito</span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Bloquea automáticamente los gastos que superen este presupuesto.
                    </span>
                </label>
            </div>

            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-4 py-2 text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg font-medium transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors"
                >
                    {initialData ? 'Actualizar' : 'Crear'}
                </button>
            </div>
        </form>
    );
}
