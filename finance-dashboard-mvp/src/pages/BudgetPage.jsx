import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useFinance } from '../hooks/useFinance';
import { useLanguage } from '../contexts/LanguageContext';
import { formatCompactCurrency } from '../utils/formatters';
import { parseApiError } from '../lib/apiErrors';

import { Card } from '../features/common/components/Card';
import { Modal } from '../features/common/components/Modal';
import { ConfirmDeleteModal } from '../features/common/components/ConfirmDeleteModal';
import { EmptyState } from '../features/common/components/EmptyState';
import { PageHeader } from '../features/common/components/PageHeader';
import { BudgetForm } from '../features/budgets/components/BudgetForm';
import { EnvelopesPanel } from '../features/budgets/components/EnvelopesPanel';
import { Plus, AlertCircle, Trash2, PieChart, Edit2, TrendingUp } from 'lucide-react';
import { BTN_PRIMARY } from '../lib/formClasses';
import { groupTransactionsByCategory, calculateBudgetUsage } from '../utils/calculations';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

export function BudgetPage() {
    const { budgets, transactions, categories, loading, addBudget, updateBudget, deleteBudget } = useFinance();
    const { t } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);

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
                toast.success(t('budget.toastUpdated'));
            } else {
                await addBudget(formData);
                toast.success(t('budget.toastCreated'));
            }
            handleCloseModal();
        } catch (error) {
            console.error("Error saving budget:", error);
            toast.error(parseApiError(error, t('budget.toastSaveError')));
        }
    };

    const handleToggleStrict = async (budget) => {
        const next = !budget.isStrict;
        try {
            await updateBudget(budget.id, { isStrict: next });
            toast.success(next ? t('budget.toastPiggyOn') : t('budget.toastPiggyOff'));
        } catch (err) {
            toast.error(parseApiError(err, t('budget.toastPiggyError')));
        }
    };

    const handleDelete = (id) => setConfirmDeleteId(id);

    const handleConfirmDelete = async () => {
        setDeleting(true);
        try {
            await deleteBudget(confirmDeleteId);
            toast.success(t('budget.toastDeleted'));
            setConfirmDeleteId(null);
        } catch (err) {
            toast.error(parseApiError(err, t('budget.toastDeleteError')));
        } finally {
            setDeleting(false);
        }
    };

    const budgetToDelete = useMemo(
        () => budgetWithActuals.find(b => b.id === confirmDeleteId),
        [budgetWithActuals, confirmDeleteId]
    );

    const exceededCount = budgetWithActuals.filter(b => b.exceeded).length;

    if (loading) {
        return (
            <div className="space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-3">
                        <div className="h-4 w-28 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-md animate-pulse" />
                        <div className="h-9 w-60 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-xl animate-pulse" />
                    </div>
                    <div className="h-14 w-full md:w-48 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-2xl animate-pulse" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {[1, 2, 3].map(n => (
                        <div key={n} className="h-52 bg-zinc-100 dark:bg-zinc-800/50 rounded-3xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    const subtitle = budgetWithActuals.length === 0
        ? t('budget.subtitleEmpty')
        : exceededCount > 0
            ? `${exceededCount} ${exceededCount === 1 ? t('budget.exceededSingular') : t('budget.exceededPlural')} ${t('budget.thisMonth')}`
            : `${budgetWithActuals.length} ${budgetWithActuals.length === 1 ? t('budget.activeSingular') : t('budget.activePlural')}, ${t('budget.allOnTrack')}`;

    return (
        <div className="space-y-10">
                <PageHeader
                    section="budget"
                    icon={PieChart}
                    kicker={t('budget.kicker')}
                    title={t('budget.title')}
                    subtitle={subtitle}
                    action={
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className={cn(BTN_PRIMARY, "w-full md:w-auto group py-3.5")}
                        >
                            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                            {t('budget.newBudget')}
                        </button>
                    }
                />

                {/* Envelopes mode (#60) */}
                <EnvelopesPanel />

                {/* Budgets Grid */}
                {budgetWithActuals.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {budgetWithActuals.map((budget, index) => {
                            const categoryInfo = categories.find(c => c.name === budget.categoryName);
                            // Priorizamos el color del presupuesto; si está vacío caemos al de la categoría.
                            const color = budget.color || categoryInfo?.color || '#6366f1';
                            const periodLabel = budget.period === 'WEEKLY' ? t('budget.periodWeekly')
                                : budget.period === 'YEARLY' ? t('budget.periodYearly')
                                : t('budget.periodMonthly');

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
                                                    <span>{periodLabel}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleOpenEdit(budget)}
                                                aria-label={t('budget.editAria')}
                                                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-emerald-500"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(budget.id)}
                                                aria-label={t('budget.deleteAria')}
                                                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-rose-500"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-widest font-black text-zinc-400 mb-1">{t('budget.consumed')}</p>
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
                                                className="absolute top-0 left-0 h-full rounded-full"
                                                style={{
                                                    backgroundColor: budget.exceeded ? '#f43f5e' : color,
                                                    boxShadow: `0 0 12px ${budget.exceeded ? '#f43f5e' : color}40`,
                                                }}
                                            />
                                        </div>

                                        <div className="pt-2 flex items-center justify-between text-[11px] font-bold">
                                            {budget.exceeded ? (
                                                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg">
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                    <span>{t('budget.limitExceeded')}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                                                    <TrendingUp className="w-3.5 h-3.5" />
                                                    <span>{t('budget.withinBudget')}</span>
                                                </div>
                                            )}
                                            <span className="text-zinc-400">{t('budget.remaining')} {formatCompactCurrency(budget.remaining)}</span>
                                        </div>

                                        {/* Modo chanchito per-budget (#chanchito): bloquea gastos que superen el límite */}
                                        <div className="pt-3 mt-1 border-t border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between">
                                            <span
                                                className="text-xs font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5"
                                                title={t('budget.piggyTitle')}
                                            >
                                                🐷 {t('budget.piggyMode')}
                                            </span>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={!!budget.isStrict}
                                                aria-label={t('budget.piggyAria')}
                                                onClick={() => handleToggleStrict(budget)}
                                                className={cn(
                                                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900",
                                                    budget.isStrict ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                                                )}
                                            >
                                                <span className={cn(
                                                    "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                                                    budget.isStrict ? "translate-x-6" : "translate-x-1"
                                                )} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Decoración Glass sutil */}
                                    <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent blur-2xl rounded-full" />
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <EmptyState
                        icon={PieChart}
                        tone="violet"
                        title={t('budget.emptyTitle')}
                        description={t('budget.emptyDesc')}
                        actionLabel={t('budget.emptyAction')}
                        onAction={handleOpenCreate}
                    />
                )}

                <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingBudget ? t('budget.editModalTitle') : t('budget.newModalTitle')}>
                    <BudgetForm
                        onSubmit={handleSubmit}
                        onCancel={handleCloseModal}
                        initialData={editingBudget}
                        categories={categories}
                    />
                </Modal>

                <ConfirmDeleteModal
                    isOpen={!!confirmDeleteId}
                    onClose={() => !deleting && setConfirmDeleteId(null)}
                    onConfirm={handleConfirmDelete}
                    title={t('budget.confirmDeleteTitle')}
                    description={t('budget.confirmDeleteDesc')}
                    itemName={budgetToDelete?.categoryName}
                    loading={deleting}
                />
            </div>
    );
}
