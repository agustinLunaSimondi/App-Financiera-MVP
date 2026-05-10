import React, { useState } from 'react';
import { toast } from 'sonner';
import { useFinance } from '../hooks/useFinance';
import { formatCurrency, formatCompactCurrency } from '../utils/formatters';

import { Card } from '../features/common/components/Card';
import { Modal } from '../features/common/components/Modal';
import { BudgetForm } from '../features/budgets/components/BudgetForm';
import { Plus, AlertCircle, Trash2, PieChart, Edit2, TrendingUp, AlertTriangle } from 'lucide-react';
import { groupTransactionsByCategory, calculateBudgetUsage } from '../utils/calculations';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

export function BudgetPage() {
    const { budgets, transactions, categories, loading, addBudget, updateBudget, deleteBudget } = useFinance();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-zinc-500">Cargando presupuestos...</div>
            </div>
        );
    }

    const expenseTransactions = transactions.filter(tx => tx.amount < 0);
    const expensesByCategory = groupTransactionsByCategory(expenseTransactions);

    const budgetWithActuals = budgets.map(budget => {
        const categoryName = typeof budget.category === 'object' ? budget.category?.name : budget.category;
        const spent = Math.abs(expensesByCategory.find(cat => cat.category === categoryName)?.total || 0);
        const percentage = calculateBudgetUsage(spent, budget.amount);
        const exceeded = spent > budget.amount;

        return {
            ...budget,
            categoryName,
            spent,
            percentage,
            exceeded,
            remaining: Math.max(0, budget.amount - spent)
        };
    });

    const handleOpenCreate = () => {
        setEditingBudget(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (budget) => {
        setEditingBudget(budget);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingBudget(null);
    };

    const handleSubmit = async (formData) => {
        try {
            if (editingBudget) {
                await updateBudget(editingBudget.id, formData);
                toast.success('Presupuesto actualizado correctamente');
            } else {
                await addBudget(formData);
                toast.success('Presupuesto creado correctamente');
            }
            handleCloseModal();
        } catch (error) {
            console.error("Error saving budget:", error);
            toast.error('Error al guardar el presupuesto');
        }
    };

    const handleDelete = (id) => setConfirmDeleteId(id);

    const handleConfirmDelete = async () => {
        try {
            await deleteBudget(confirmDeleteId);
            toast.success('Presupuesto eliminado');
        } catch {
            toast.error('Error al eliminar el presupuesto');
        } finally {
            setConfirmDeleteId(null);
        }
    };

    return (
        <div className="space-y-10">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-500/10 rounded-lg">
                                <PieChart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Planificación</h2>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">Presupuestos</h1>
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 px-6 py-3.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold shadow-xl transition-all active:scale-95 group"
                    >
                        <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                        Nuevo Presupuesto
                    </button>
                </header>

                {/* Budgets Grid */}
                {budgetWithActuals.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {budgetWithActuals.map((budget, index) => {
                            const categoryInfo = categories.find(c => c.name === budget.categoryName);
                            const color = categoryInfo?.color || '#6366f1';

                            return (
                                <Card key={budget.id} className="group relative overflow-hidden" delay={index * 0.1}>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-300"
                                                style={{ backgroundColor: `${color}15`, color: color }}
                                            >
                                                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: color, opacity: 0.8 }} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-zinc-900 dark:text-white text-lg tracking-tight">{budget.categoryName}</h4>
                                                <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs mt-1">
                                                    <TrendingUp className="w-3 h-3" />
                                                    <span>{budget.period === 'MONTHLY' ? 'Mensual' : 'Semanal'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleOpenEdit(budget)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-emerald-500">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(budget.id)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-rose-500">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-widest font-black text-zinc-400 mb-1">Consumido</p>
                                                <p className="text-2xl font-black text-zinc-900 dark:text-white">
                                                    {formatCompactCurrency(budget.spent)}
                                                    <span className="text-sm font-medium text-zinc-400 ml-1">/ {formatCompactCurrency(budget.amount)}</span>
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className={cn(
                                                    "text-xl font-black",
                                                    budget.exceeded ? "text-rose-500" : "text-emerald-500"
                                                )}>{Math.round(budget.percentage)}%</span>
                                            </div>
                                        </div>

                                        <div className="relative h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(budget.percentage, 100)}%` }}
                                                transition={{ duration: 1, delay: index * 0.1 + 0.3, ease: "easeOut" }}
                                                className={cn(
                                                    "absolute top-0 left-0 h-full rounded-full",
                                                    budget.exceeded ? "bg-rose-500" : "bg-emerald-500"
                                                )}
                                                style={{
                                                    boxShadow: budget.exceeded ? '0 0 12px #f43f5e40' : '0 0 12px #10b98140'
                                                }}
                                            />
                                        </div>

                                        <div className="pt-2 flex items-center justify-between text-[11px] font-bold">
                                            {budget.exceeded ? (
                                                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg">
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                    <span>Límite excedido</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                                                    <TrendingUp className="w-3.5 h-3.5" />
                                                    <span>Dentro del presupuesto</span>
                                                </div>
                                            )}
                                            <span className="text-zinc-400">Restan {formatCompactCurrency(budget.remaining)}</span>
                                        </div>
                                    </div>

                                    {/* Decoración Glass sutil */}
                                    <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent blur-2xl rounded-full" />
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="glass p-20 rounded-[3rem] text-center space-y-6">
                        <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto">
                            <PieChart className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="max-w-xs mx-auto">
                            <h3 className="text-2xl font-black text-zinc-900 dark:text-white">Sin Presupuestos</h3>
                            <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">Define límites por categoría para optimizar tus gastos mensuales.</p>
                        </div>
                        <button
                            onClick={handleOpenCreate}
                            className="px-8 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-zinc-900/10 dark:shadow-none"
                        >
                            Crear Primer Presupuesto
                        </button>
                    </div>
                )}

                <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingBudget ? "Editar Presupuesto" : "Nuevo Presupuesto"}>
                    <BudgetForm
                        onSubmit={handleSubmit}
                        onCancel={handleCloseModal}
                        initialData={editingBudget}
                        categories={categories}
                    />
                </Modal>

                {confirmDeleteId && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-sm">
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl shadow-zinc-900/20 p-4 flex items-center gap-4">
                            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-zinc-900 dark:text-white">¿Eliminar presupuesto?</p>
                                <p className="text-xs text-zinc-500">Esta acción no se puede deshacer.</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button onClick={() => setConfirmDeleteId(null)} className="px-3 py-1.5 text-xs font-bold border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400">
                                    Cancelar
                                </button>
                                <button onClick={handleConfirmDelete} className="px-3 py-1.5 text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-colors">
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
    );
}
