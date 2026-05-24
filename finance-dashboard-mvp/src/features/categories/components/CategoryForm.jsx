import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

export function CategoryForm({ onSubmit, onCancel, initialData = null }) {
    const [formData, setFormData] = useState({
        name: '',
        type: 'EXPENSE',
        color: '#6B7280',
        icon: '',
        taxDeductible: false,
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                type: initialData.type,
                color: initialData.color || '#6B7280',
                icon: initialData.icon || '',
                taxDeductible: !!initialData.taxDeductible,
            });
        } else {
            setFormData({ name: '', type: 'EXPENSE', color: '#6B7280', icon: '', taxDeductible: false });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            name: formData.name.trim(),
            type: formData.type,
            color: formData.color,
            taxDeductible: formData.taxDeductible,
        };
        if (formData.icon && formData.icon.trim()) payload.icon = formData.icon.trim();
        onSubmit(payload);
    };

    const colors = [
        '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4',
        '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#6B7280'
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {initialData ? 'Editar Categoría' : 'Nueva Categoría'}
                </h3>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Nombre
                </label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    maxLength={30}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-colors"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Tipo
                    </label>
                    <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-colors"
                    >
                        <option value="EXPENSE">Gasto</option>
                        <option value="INCOME">Ingreso</option>
                    </select>
                </div>
                {/* Icon input skipped for simplicity, maybe add later */}
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Color
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                    {colors.map(color => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, color }))}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${formData.color === color ? 'ring-2 ring-offset-2 ring-emerald-500 dark:ring-offset-zinc-900' : ''
                                }`}
                            style={{ backgroundColor: color }}
                        >
                            {formData.color === color && <Check className="w-4 h-4 text-white" />}
                        </button>
                    ))}
                    {/* Color personalizado */}
                    <label
                        title="Color personalizado"
                        className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-600 cursor-pointer hover:scale-110 transition-transform overflow-hidden"
                        style={!colors.includes(formData.color) ? { backgroundColor: formData.color, borderColor: formData.color } : {}}
                    >
                        <input
                            type="color"
                            name="color"
                            value={formData.color}
                            onChange={handleChange}
                            className="w-0 h-0 opacity-0 absolute"
                        />
                        {!colors.includes(formData.color) && <Check className="w-4 h-4 text-white" />}
                    </label>
                </div>
            </div>

            {/* Tax deductible — solo aplica a categorías de gasto (AFIP). */}
            {formData.type === 'EXPENSE' && (
                <label className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 cursor-pointer hover:bg-emerald-500/10 transition-colors">
                    <input
                        type="checkbox"
                        checked={formData.taxDeductible}
                        onChange={(e) => setFormData(prev => ({ ...prev, taxDeductible: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 rounded accent-emerald-500"
                    />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Categoría deducible (AFIP)</p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Marcala si vas a incluirla en el reporte para tu contador (freelancers, monotributistas).
                        </p>
                    </div>
                </label>
            )}

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
