import React, { useState, useEffect } from 'react';
import { useFinance } from '../../../hooks/useFinance';
import { cn } from '../../../lib/utils';

export function RecurringTransactionForm({ rt, onSubmit, onCancel }) {
    const { accounts, categories } = useFinance();
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        type: 'EXPENSE',
        frequency: 'MONTHLY',
        accountId: '',
        categoryId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        isActive: true
    });

    useEffect(() => {
        if (rt) {
            setFormData({
                description: rt.description || '',
                amount: Math.abs(rt.amount) || '',
                // El signo del monto guardado define el tipo: negativo = gasto, positivo = ingreso.
                type: rt.amount < 0 ? 'EXPENSE' : 'INCOME',
                frequency: rt.frequency || 'MONTHLY',
                accountId: rt.accountId || (accounts[0]?.id || ''),
                categoryId: rt.categoryId || (categories[0]?.id || ''),
                startDate: rt.startDate ? rt.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
                endDate: rt.endDate ? rt.endDate.split('T')[0] : '',
                isActive: rt.isActive !== undefined ? rt.isActive : true
            });
        } else {
            setFormData(prev => ({
                ...prev,
                accountId: accounts[0]?.id || '',
                categoryId: categories[0]?.id || ''
            }));
        }
    }, [rt, accounts, categories]);

    const handleSubmit = (e) => {
        e.preventDefault();
        // `type` es solo de UI; el backend infiere gasto/ingreso por el signo del monto.
        const { type, ...payload } = formData;
        const magnitude = Math.abs(parseFloat(formData.amount));
        // endDate vacía rompe la validación Pydantic (Optional[date]); convertir a null
        onSubmit({
            ...payload,
            amount: type === 'EXPENSE' ? -magnitude : magnitude,
            endDate: formData.endDate ? formData.endDate : null
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Tipo</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
                        className={cn(
                            "px-4 py-3 rounded-xl font-bold text-sm transition-all active:scale-95",
                            formData.type === 'EXPENSE'
                                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        )}
                    >
                        Gasto
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'INCOME' })}
                        className={cn(
                            "px-4 py-3 rounded-xl font-bold text-sm transition-all active:scale-95",
                            formData.type === 'INCOME'
                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        )}
                    >
                        Ingreso
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Descripción</label>
                <input
                    type="text"
                    required
                    className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all font-medium"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ej: Suscripción Netflix, Alquiler..."
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Monto</label>
                    <input
                        type="number"
                        required
                        step="0.01"
                        min="0"
                        className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all font-medium"
                        value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Frecuencia</label>
                    <select
                        required
                        className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all font-medium"
                        value={formData.frequency}
                        onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                    >
                        <option value="DAILY">Diario</option>
                        <option value="WEEKLY">Semanal</option>
                        <option value="BIWEEKLY">Quincenal</option>
                        <option value="MONTHLY">Mensual</option>
                        <option value="YEARLY">Anual</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Cuenta</label>
                    <select
                        required
                        className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all font-medium"
                        value={formData.accountId}
                        onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                        disabled={accounts.length === 0}
                    >
                        <option value="">
                            {accounts.length === 0 ? 'Sin cuentas — creá una primero' : 'Seleccionar cuenta'}
                        </option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Categoría</label>
                    <select
                        required
                        className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all font-medium"
                        value={formData.categoryId}
                        onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                        disabled={categories.length === 0}
                    >
                        <option value="">
                            {categories.length === 0 ? 'Sin categorías' : 'Seleccionar categoría'}
                        </option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Fecha de Inicio</label>
                    <input
                        type="date"
                        required
                        className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all font-medium"
                        value={formData.startDate}
                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Fecha Fin (Opcional)</label>
                    <input
                        type="date"
                        className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all font-medium"
                        value={formData.endDate}
                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    />
                </div>
            </div>

            <div className="flex gap-4 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-6 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-2xl font-bold transition-all hover:bg-zinc-200 active:scale-95"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={accounts.length === 0 || categories.length === 0}
                    className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {rt ? 'Actualizar Regla' : 'Crear Regla'}
                </button>
            </div>
        </form>
    );
}
