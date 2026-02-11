import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export function BudgetForm({ onSubmit, onCancel, initialData = null, categories = [] }) {
    const [formData, setFormData] = useState({
        categoryId: '',
        amount: '',
        period: 'MONTHLY',
        startDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (initialData) {
            // Encontrar el ID de la categoría basado en el nombre si es necesario
            // O asumir que initialData tiene categoryId si viene del backend completo
            // Pero el endpoint getBudgets devuelve category object.

            // Si initialData tiene category object:
            const catId = initialData.category?.id || initialData.categoryId;

            setFormData({
                categoryId: catId || '',
                amount: initialData.amount,
                period: initialData.period || 'MONTHLY',
                startDate: initialData.startDate ? initialData.startDate.split('T')[0] : new Date().toISOString().split('T')[0]
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
            amount: parseFloat(formData.amount)
        });
    };

    // Filtrar categorías que sean de GASTO (EXPENSE) solamente, ya que los presupuestos suelen ser para gastos
    const expenseCategories = categories.filter(c => c.type === 'EXPENSE');

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
                    <option value="">Selecciona una categoría</option>
                    {expenseCategories.map(cat => (
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

            <div className="grid grid-cols-2 gap-4">
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
