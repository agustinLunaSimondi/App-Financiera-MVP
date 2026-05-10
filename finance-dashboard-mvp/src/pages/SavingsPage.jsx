import React, { useState } from 'react';
import { toast } from 'sonner';
import { Plus, PiggyBank, Target, ArrowRight, AlertTriangle } from 'lucide-react';
import { SavingGoalCard } from '../features/savings/components/SavingGoalCard';
import { SavingGoalForm } from '../features/savings/components/SavingGoalForm';
import { Modal } from '../features/common/components/Modal';

import { useFinance } from '../hooks/useFinance';
import { formatCurrency, formatCompactCurrency } from '../utils/formatters';

export function SavingsPage() {
    const { savingsGoals, loading, addSavingGoal, updateSavingGoal, deleteSavingGoal } = useFinance();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const handleOpenModal = (goal = null) => {
        setEditingGoal(goal);
        setIsModalOpen(true);
    };

    const handleSubmit = async (formData) => {
        try {
            if (editingGoal) {
                await updateSavingGoal(editingGoal.id, formData);
                toast.success('Meta actualizada correctamente');
            } else {
                await addSavingGoal(formData);
                toast.success('Meta creada correctamente');
            }
            setIsModalOpen(false);
            setEditingGoal(null);
        } catch (error) {
            console.error('Error saving goal:', error);
            toast.error('Error al guardar la meta');
        }
    };

    const handleContribute = async (goalId, amount) => {
        const goal = savingsGoals.find(g => g.id === goalId);
        if (!goal) return;

        try {
            const updatedAmount = Number(goal.currentAmount) + Number(amount);
            await updateSavingGoal(goalId, { currentAmount: updatedAmount });
            toast.success('Contribución registrada correctamente');
        } catch (error) {
            console.error('Error contributing to goal:', error);
            toast.error('Error al registrar la contribución');
        }
    };

    const handleDelete = (id) => setConfirmDeleteId(id);

    const handleConfirmDelete = async () => {
        try {
            await deleteSavingGoal(confirmDeleteId);
            toast.success('Meta eliminada');
        } catch {
            toast.error('Error al eliminar la meta');
        } finally {
            setConfirmDeleteId(null);
        }
    };

    const totalTarget = savingsGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const totalCurrent = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    const overallPercentage = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

    return (
        <div className="space-y-10">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <PiggyBank className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Mis Metas</h2>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">Metas de Ahorro</h1>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95 group"
                    >
                        <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                        Nueva Meta
                    </button>
                </header>

                {/* Resumen General */}
                <div className="glass p-8 rounded-[2rem] relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="space-y-4 max-w-md">
                            <h3 className="text-2xl font-black text-zinc-900 dark:text-white">Tu Progreso Global</h3>
                            <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                                Has ahorrado <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCompactCurrency(totalCurrent)}</span> de tu objetivo total de <span className="text-zinc-900 dark:text-white font-bold">{formatCompactCurrency(totalTarget)}</span>.
                            </p>
                            <button className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 group/btn">
                                Ver detalles del plan <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                            </button>
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
                                    />
                                </svg>
                                <span className="absolute text-2xl font-black text-zinc-900 dark:text-white">{overallPercentage}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Decoración de Fondo */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                </div>

                {loading ? (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 opacity-50">
                        {[1, 2, 3].map(n => <div key={n} className="h-48 bg-zinc-100 dark:bg-zinc-800 rounded-3xl animate-pulse" />)}
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
                    <div className="glass p-12 rounded-[2rem] text-center space-y-4">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                            <Target className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Aún no tienes metas</h3>
                            <p className="text-zinc-500 dark:text-zinc-400 mt-2">Empieza a ahorrar para lo que más quieres hoy mismo.</p>
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold transition-transform active:scale-95"
                        >
                            Crear mi primera meta
                        </button>
                    </div>
                )}

                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={editingGoal ? "Editar Meta de Ahorro" : "Nueva Meta de Ahorro"}
                >
                    <SavingGoalForm
                        goal={editingGoal}
                        onSubmit={handleSubmit}
                        onCancel={() => setIsModalOpen(false)}
                    />
                </Modal>

                {confirmDeleteId && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-sm">
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl shadow-zinc-900/20 p-4 flex items-center gap-4">
                            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-zinc-900 dark:text-white">¿Eliminar esta meta?</p>
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
