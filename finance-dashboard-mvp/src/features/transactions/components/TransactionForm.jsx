import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Plus, X, ArrowRight } from 'lucide-react';
import { useFinance } from '../../../hooks/useFinance';

const INPUT_CLS = "w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-colors text-sm";
const LABEL_CLS = "block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5";

const apiErrorMessage = (err, fallback) => {
    const detail = err?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map(d => d.msg || JSON.stringify(d)).join(', ');
    return err?.message || fallback;
};

// ─── Inline New Category Panel ─────────────────────────────
function NewCategoryPanel({ onCreated, onCancel, transactionType }) {
    const { addCategory } = useFinance();
    const [name, setName] = useState('');
    const [color, setColor] = useState('#10b981');
    const [saving, setSaving] = useState(false);

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            const type = transactionType === 'INCOME' ? 'INCOME' : 'EXPENSE';
            const newCat = await addCategory({ name: name.trim(), color, type });
            toast.success(`Categoría "${name.trim()}" creada`);
            onCreated(newCat);
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Error al crear la categoría'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mt-2 p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Nueva categoría</span>
                <button type="button" onClick={onCancel} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                    <X size={16} />
                </button>
            </div>
            <input
                autoFocus
                type="text"
                placeholder="Nombre de la categoría"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSave();
                    }
                }}
                className={INPUT_CLS}
                maxLength={30}
            />
            <div>
                <p className="text-xs text-zinc-400 mb-2">Color</p>
                <div className="flex gap-2 flex-wrap">
                    {COLORS.map(c => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                            style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
                            aria-label={`Color ${c}`}
                        />
                    ))}
                </div>
            </div>
            <div className="flex gap-2 pt-1">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!name.trim() || saving}
                    className="flex-1 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                    {saving ? 'Guardando...' : 'Crear'}
                </button>
            </div>
        </div>
    );
}

// ─── Main Form ────────────────────────────────────────────
export function TransactionForm({ onClose, transactionToEdit = null }) {
    const { addTransaction, updateTransaction, accounts, categories, loading } = useFinance();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showNewCategory, setShowNewCategory] = useState(false);

    const handleGoToAccounts = () => {
        onClose?.();
        navigate('/cards');
    };

    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        type: 'EXPENSE',
        categoryId: '',
        accountId: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (transactionToEdit) {
            const txDate = transactionToEdit.transactionDate || transactionToEdit.date;
            setFormData({
                description: transactionToEdit.description || '',
                amount: Math.abs(transactionToEdit.amount).toString(),
                type: transactionToEdit.amount > 0 ? 'INCOME' : 'EXPENSE',
                categoryId: transactionToEdit.categoryId || '',
                accountId: transactionToEdit.accountId || '',
                date: txDate ? txDate.split('T')[0] : new Date().toISOString().split('T')[0]
            });
        } else {
            // Set defaults from existing accounts/categories — only if not set yet
            setFormData(prev => {
                const next = { ...prev };
                if (!next.accountId && accounts.length > 0) next.accountId = accounts[0].id;
                if (!next.categoryId) {
                    const matching = categories.filter(c => (c.type || '').toString().toUpperCase() === next.type);
                    if (matching.length > 0) next.categoryId = matching[0].id;
                    else if (categories.length > 0) next.categoryId = categories[0].id;
                }
                return next;
            });
        }
    }, [transactionToEdit, accounts, categories]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCategoryCreated = (newCat) => {
        setFormData(prev => ({ ...prev, categoryId: newCat.id }));
        setShowNewCategory(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            if (!formData.accountId) throw new Error('Debes seleccionar una cuenta');
            if (!formData.categoryId) throw new Error('Debes seleccionar una categoría');
            if (!formData.amount || parseFloat(formData.amount) <= 0) throw new Error('El monto debe ser mayor a 0');

            const finalAmount = parseFloat(formData.amount) * (formData.type === 'EXPENSE' ? -1 : 1);

            const payload = {
                description: formData.description.trim(),
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
            const msg = apiErrorMessage(err, 'Ocurrió un error al guardar');
            setError(msg);
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // Filter categories by transaction type (case-insensitive for safety)
    const filteredCategories = categories.filter(cat => {
        const catType = (cat.type || '').toString().toUpperCase();
        return catType === formData.type || catType === 'BOTH' || !catType;
    });
    // Fallback: if the filter yields nothing, show all categories
    const categoryOptions = filteredCategories.length > 0 ? filteredCategories : categories;
    const categoriesEmpty = categories.length === 0;
    const accountsEmpty = accounts.length === 0;

    if (!loading && accountsEmpty) {
        return (
            <div className="text-center space-y-5 py-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Plus className="w-7 h-7 text-amber-500" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-zinc-900 dark:text-white">Necesitás una cuenta primero</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 max-w-xs mx-auto">
                        Las transacciones se asocian a una cuenta o tarjeta. Creá una para empezar.
                    </p>
                </div>
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium text-sm"
                    >
                        Cerrar
                    </button>
                    <button
                        type="button"
                        onClick={handleGoToAccounts}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors group"
                    >
                        Crear cuenta
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                    {error}
                </div>
            )}

            {/* Tipo de Transacción */}
            <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'EXPENSE', categoryId: '' }))}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formData.type === 'EXPENSE'
                        ? 'bg-white dark:bg-zinc-700 text-red-600 dark:text-red-400 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                >
                    Gasto
                </button>
                <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'INCOME', categoryId: '' }))}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formData.type === 'INCOME'
                        ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                >
                    Ingreso
                </button>
            </div>

            {/* Monto */}
            <div>
                <label className={LABEL_CLS}>Monto</label>
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
                    <input
                        type="number"
                        inputMode="decimal"
                        name="amount"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        required
                        className={`${INPUT_CLS} pl-8`}
                        value={formData.amount}
                        onChange={handleChange}
                    />
                </div>
            </div>

            {/* Descripción */}
            <div>
                <label className={LABEL_CLS}>Descripción</label>
                <input
                    type="text"
                    name="description"
                    placeholder="Ej. Compra supermercado"
                    required
                    maxLength={100}
                    className={INPUT_CLS}
                    value={formData.description}
                    onChange={handleChange}
                />
            </div>

            {/* Categoría con opción de crear nueva */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className={LABEL_CLS + ' mb-0'}>Categoría</label>
                    {!showNewCategory && (
                        <button
                            type="button"
                            onClick={() => setShowNewCategory(true)}
                            className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                            <Plus size={12} /> Nueva
                        </button>
                    )}
                </div>
                <select
                    name="categoryId"
                    required
                    className={INPUT_CLS}
                    value={formData.categoryId}
                    onChange={handleChange}
                    disabled={loading && categoriesEmpty}
                >
                    <option value="">
                        {loading && categoriesEmpty
                            ? 'Cargando categorías…'
                            : categoriesEmpty
                                ? 'Sin categorías — creá una con el botón "Nueva"'
                                : 'Seleccionar categoría'}
                    </option>
                    {categoryOptions.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
                {showNewCategory && (
                    <NewCategoryPanel
                        transactionType={formData.type}
                        onCreated={handleCategoryCreated}
                        onCancel={() => setShowNewCategory(false)}
                    />
                )}
            </div>

            {/* Cuenta */}
            <div>
                <label className={LABEL_CLS}>Cuenta</label>
                <select
                    name="accountId"
                    required
                    className={INPUT_CLS}
                    value={formData.accountId}
                    onChange={handleChange}
                    disabled={loading && accountsEmpty}
                >
                    <option value="">
                        {loading && accountsEmpty
                            ? 'Cargando cuentas…'
                            : accountsEmpty
                                ? 'Sin cuentas — creá una en "Cuentas y Tarjetas"'
                                : 'Seleccionar cuenta'}
                    </option>
                    {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                </select>
            </div>

            {/* Fecha */}
            <div>
                <label className={LABEL_CLS}>Fecha</label>
                <input
                    type="date"
                    name="date"
                    required
                    className={INPUT_CLS}
                    value={formData.date}
                    onChange={handleChange}
                />
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium text-sm"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={submitting || accountsEmpty}
                    className="flex-1 px-4 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
                >
                    {submitting ? 'Guardando...' : (transactionToEdit ? 'Actualizar' : 'Guardar')}
                </button>
            </div>
        </form>
    );
}
