import React, { useState, useEffect } from 'react';
import { useFinance } from '../../../hooks/useFinance';

export function AccountForm({ onClose, accountToEdit = null }) {
    const { addAccount, updateAccount } = useFinance();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        type: 'CHECKING', // CHECKING | SAVINGS | CREDIT | INVESTMENT
        balance: '',
        currency: 'USD'
    });

    useEffect(() => {
        if (accountToEdit) {
            setFormData({
                name: accountToEdit.name,
                type: accountToEdit.type,
                balance: accountToEdit.balance.toString(),
                currency: accountToEdit.currency
            });
        }
    }, [accountToEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!formData.name) throw new Error('El nombre es obligatorio');
            if (formData.balance === '') throw new Error('El balance inicial es obligatorio');

            const payload = {
                name: formData.name,
                type: formData.type,
                balance: parseFloat(formData.balance),
                currency: formData.currency
            };

            if (accountToEdit) {
                await updateAccount(accountToEdit.id, payload);
            } else {
                await addAccount(payload);
            }

            onClose();
        } catch (err) {
            setError(err.message || 'Error al guardar la cuenta');
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

            {/* Nombre */}
            <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Nombre de la Cuenta
                </label>
                <input
                    type="text"
                    name="name"
                    placeholder="Ej. Banco Galicia, Efectivo"
                    required
                    className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    value={formData.name}
                    onChange={handleChange}
                />
            </div>

            {/* Tipo */}
            <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Tipo de Cuenta
                </label>
                <select
                    name="type"
                    required
                    className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    value={formData.type}
                    onChange={handleChange}
                >
                    <option value="CHECKING">Cuenta Corriente / Efectivo</option>
                    <option value="SAVINGS">Caja de Ahorro</option>
                    <option value="CREDIT">Tarjeta de Crédito</option>
                    <option value="INVESTMENT">Inversión</option>
                </select>
            </div>

            {/* Moneda */}
            <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Moneda
                </label>
                <select
                    name="currency"
                    required
                    className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    value={formData.currency}
                    onChange={handleChange}
                >
                    <option value="USD">Dólar (USD)</option>
                    <option value="ARS">Peso Argentino (ARS)</option>
                    <option value="EUR">Euro (EUR)</option>
                </select>
            </div>

            {/* Balance Inicial */}
            <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Balance Inicial
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input
                        type="number"
                        name="balance"
                        step="0.01"
                        placeholder="0.00"
                        required
                        className="w-full pl-7 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        value={formData.balance}
                        onChange={handleChange}
                    />
                </div>
                <p className="text-xs text-zinc-500 mt-1">Para tarjetas de crédito, usa números negativos para deuda.</p>
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
                    {loading ? 'Guardando...' : (accountToEdit ? 'Actualizar' : 'Guardar')}
                </button>
            </div>
        </form>
    );
}
