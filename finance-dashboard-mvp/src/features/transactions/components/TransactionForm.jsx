import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useFinance } from '../../../hooks/useFinance';

export function TransactionForm({ onClose, transactionToEdit = null }) {
    const { addTransaction, updateTransaction, accounts, categories } = useFinance();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        type: 'EXPENSE', // EXPENSE | INCOME
        categoryId: '',
        accountId: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (transactionToEdit) {
            const txDate = transactionToEdit.transactionDate || transactionToEdit.date;
            setFormData({
                description: transactionToEdit.description,
                amount: Math.abs(transactionToEdit.amount).toString(),
                type: transactionToEdit.amount > 0 ? 'INCOME' : 'EXPENSE',
                categoryId: transactionToEdit.categoryId,
                accountId: transactionToEdit.accountId,
                date: txDate ? txDate.split('T')[0] : new Date().toISOString().split('T')[0]
            });
        } else {
            // Defaults
            if (accounts.length > 0) setFormData(prev => ({ ...prev, accountId: accounts[0].id }));
            if (categories.length > 0) setFormData(prev => ({ ...prev, categoryId: categories[0].id }));
        }
    }, [transactionToEdit, accounts, categories]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Validaciones
            if (!formData.accountId) throw new Error('Debes seleccionar una cuenta');
            if (!formData.categoryId) throw new Error('Debes seleccionar una categoría');
            if (!formData.amount || parseFloat(formData.amount) <= 0) throw new Error('El monto debe ser mayor a 0');

            const finalAmount = parseFloat(formData.amount) * (formData.type === 'EXPENSE' ? -1 : 1);

            const payload = {
                description: formData.description,
                amount: finalAmount,
                categoryId: formData.categoryId,
                accountId: formData.accountId,
                transactionDate: formData.date
            };

            if (transactionToEdit) {
                await updateTransaction(transactionToEdit.id, payload);
                toast.success('Transacción actualizada correctamente');
            } else {
                await addTransaction(payload);
                toast.success('Transacción creada correctamente');
            }

            onClose();
        } catch (err) {
            setError(err.message || 'Ocurrió un error al guardar');
            toast.error(err.message || 'Error al guardar la transacción');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                    {error}
                </div>
            )}

            {/* Tipo de Transacción */}
            <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-700/50 rounded-lg">
                <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'EXPENSE' }))}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${formData.type === 'EXPENSE'
                        ? 'bg-white dark:bg-zinc-600 text-red-600 dark:text-red-400 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
                        }`}
                >
                    Gasto
                </button>
                <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'INCOME' }))}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${formData.type === 'INCOME'
                        ? 'bg-white dark:bg-zinc-600 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
                        }`}
                >
                    Ingreso
                </button>
            </div>

            {/* Monto */}
            <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Monto
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input
                        type="number"
                        name="amount"
                        step="0.01"
                        placeholder="0.00"
                        required
                        className="w-full pl-7 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        value={formData.amount}
                        onChange={handleChange}
                    />
                </div>
            </div>

            {/* Descripción */}
            <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Descripción
                </label>
                <input
                    type="text"
                    name="description"
                    placeholder="Ej. Compra supermercado"
                    required
                    className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    value={formData.description}
                    onChange={handleChange}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Categoría */}
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Categoría
                    </label>
                    <select
                        name="categoryId"
                        required
                        className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        value={formData.categoryId}
                        onChange={handleChange}
                    >
                        <option value="">Seleccionar</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                {/* Cuenta */}
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Cuenta
                    </label>
                    <select
                        name="accountId"
                        required
                        className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        value={formData.accountId}
                        onChange={handleChange}
                    >
                        <option value="">Seleccionar</option>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Fecha */}
            <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Fecha
                </label>
                <input
                    type="date"
                    name="date"
                    required
                    className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    value={formData.date}
                    onChange={handleChange}
                />
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 font-medium"
                >
                    {loading ? 'Guardando...' : (transactionToEdit ? 'Actualizar' : 'Guardar')}
                </button>
            </div>
        </form>
    );
}
