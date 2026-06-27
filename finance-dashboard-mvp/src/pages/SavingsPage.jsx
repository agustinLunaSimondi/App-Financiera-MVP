import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, PiggyBank, Target } from 'lucide-react';
import { SavingGoalCard } from '../features/savings/components/SavingGoalCard';
import { SavingGoalForm } from '../features/savings/components/SavingGoalForm';
import { Modal } from '../features/common/components/Modal';
import { ConfirmDeleteModal } from '../features/common/components/ConfirmDeleteModal';
import { EmptyState } from '../features/common/components/EmptyState';
import { PageHeader } from '../features/common/components/PageHeader';

import { useFinance } from '../hooks/useFinance';
import { useLanguage } from '../contexts/LanguageContext';
import { formatCompactCurrency } from '../utils/formatters';
import { parseApiError } from '../lib/apiErrors';
import { BTN_PRIMARY_ACCENT } from '../lib/formClasses';
import { cn } from '../lib/utils';

export function SavingsPage() {
    const { savingsGoals, loading, addSavingGoal, updateSavingGoal, deleteSavingGoal } = useFinance();
    const { t } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const handleOpenModal = (goal = null) => {
        setEditingGoal(goal);
        setIsModalOpen(true);
    };

    const handleSubmit = async (formData) => {
        try {
            if (editingGoal) {
                await updateSavingGoal(editingGoal.id, formData);
                toast.success(t('savings.toastUpdated'));
            } else {
                await addSavingGoal(formData);
                toast.success(t('savings.toastCreated'));
            }
            setIsModalOpen(false);
            setEditingGoal(null);
        } catch (error) {
            console.error('Error saving goal:', error);
            const detail = error?.response?.data?.detail;
            const msg = typeof detail === 'string' ? detail
                : Array.isArray(detail) ? detail.map(d => d.msg).join(', ')
                : t('savings.toastSaveError');
            toast.error(msg);
        }
    };

    const handleContribute = async (goalId, amount) => {
        const goal = savingsGoals.find(g => g.id === goalId);
        if (!goal) return;

        try {
            const updatedAmount = Number(goal.currentAmount) + Number(amount);
            await updateSavingGoal(goalId, { currentAmount: updatedAmount });
            toast.success(`${t('savings.depositPrefix')} ${formatCompactCurrency(amount)} ${t('savings.depositSuffix')}`);
        } catch (error) {
            console.error('Error contributing to goal:', error);
            const detail = error?.response?.data?.detail;
            const msg = typeof detail === 'string' ? detail : t('savings.toastContributeError');
            toast.error(msg);
        }
    };

    const handleDelete = (id) => setConfirmDeleteId(id);

    const handleConfirmDelete = async () => {
        setDeleting(true);
        try {
            await deleteSavingGoal(confirmDeleteId);
            toast.success(t('savings.toastDeleted'));
            setConfirmDeleteId(null);
        } catch (err) {
            toast.error(parseApiError(err, t('savings.toastDeleteError')));
        } finally {
            setDeleting(false);
        }
    };

    const goalToDelete = useMemo(
        () => savingsGoals.find(g => g.id === confirmDeleteId),
        [savingsGoals, confirmDeleteId]
    );

    const safeNum = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);
    const totalTarget = savingsGoals.reduce((sum, goal) => sum + safeNum(goal.targetAmount), 0);
    const totalCurrent = savingsGoals.reduce((sum, goal) => sum + safeNum(goal.currentAmount), 0);
    const rawPercentage = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
    const overallPercentage = Number.isFinite(rawPercentage) ? Math.min(Math.max(rawPercentage, 0), 999) : 0;

    const goalsLabel = savingsGoals.length === 1 ? t('savings.goalActive') : t('savings.goalsActive');

    return (
        <div className="space-y-10">
                <PageHeader
                    section="savings"
                    icon={PiggyBank}
                    kicker={t('savings.kicker')}
                    title={t('savings.title')}
                    subtitle={
                        savingsGoals.length === 0
                            ? t('savings.subtitleEmpty')
                            : `${savingsGoals.length} ${goalsLabel} — ${overallPercentage}% ${t('savings.completed')}`
                    }
                    action={
                        <button
                            type="button"
                            onClick={() => handleOpenModal()}
                            className={cn(BTN_PRIMARY_ACCENT, "w-full md:w-auto group py-3.5")}
                        >
                            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                            {t('savings.newGoal')}
                        </button>
                    }
                />

                {/* Resumen General — solo cuando hay metas */}
                {savingsGoals.length > 0 && (
                    <div className="glass p-6 md:p-8 rounded-[2rem] relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div className="space-y-4 max-w-md">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                    {savingsGoals.length} {goalsLabel}
                                </div>
                                <h3 className="text-2xl font-black text-zinc-900 dark:text-white">{t('savings.globalProgress')}</h3>
                                <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                                    {t('savings.savedPrefix')} <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCompactCurrency(totalCurrent)}</span> {t('savings.savedMiddle')} <span className="text-zinc-900 dark:text-white font-bold">{formatCompactCurrency(totalTarget)}</span>.
                                </p>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="relative w-32 h-32 flex items-center justify-center">
                                    <svg className="w-full h-full -rotate-90">
                                        <circle
                                            cx="64" cy="64" r="58"
                                            className="stroke-zinc-100 dark:stroke-zinc-800 fill-none"
                                            strokeWidth="12"
                                        />
                                        <circle
                                            cx="64" cy="64" r="58"
                                            className="stroke-emerald-500 fill-none"
                                            strokeWidth="12"
                                            strokeDasharray="364.4"
                                            strokeDashoffset={364.4 - (364.4 * overallPercentage) / 100}
                                            strokeLinecap="round"
                                            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                                        />
                                    </svg>
                                    <span className="absolute text-2xl font-black text-zinc-900 dark:text-white">{overallPercentage}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Decoración de Fondo */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                    </div>
                )}

                {loading ? (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[1, 2, 3].map(n => <div key={n} className="h-48 bg-zinc-100 dark:bg-zinc-800/50 rounded-3xl animate-pulse" />)}
                    </div>
                ) : savingsGoals.length > 0 ? (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {savingsGoals.map((goal, index) => (
                            <SavingGoalCard
                                key={goal.id}
                                goal={goal}
                                delay={index * 0.1}
                                onContribute={handleContribute}
                                onEdit={handleOpenModal}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={Target}
                        tone="primary"
                        title={t('savings.emptyTitle')}
                        description={t('savings.emptyDesc')}
                        actionLabel={t('savings.emptyAction')}
                        onAction={() => handleOpenModal()}
                    />
                )}

                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={editingGoal ? t('savings.editModalTitle') : t('savings.newModalTitle')}
                >
                    <SavingGoalForm
                        goal={editingGoal}
                        onSubmit={handleSubmit}
                        onCancel={() => setIsModalOpen(false)}
                    />
                </Modal>

                <ConfirmDeleteModal
                    isOpen={!!confirmDeleteId}
                    onClose={() => !deleting && setConfirmDeleteId(null)}
                    onConfirm={handleConfirmDelete}
                    title={t('savings.confirmDeleteTitle')}
                    description={t('savings.confirmDeleteDesc')}
                    itemName={goalToDelete?.name}
                    loading={deleting}
                />
            </div>
    );
}
