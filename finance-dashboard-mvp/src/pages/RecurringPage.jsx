import React, { useState } from 'react';
import { useFinance } from '../hooks/useFinance';

import { Modal } from '../features/common/components/Modal';
import { Plus, Clock } from 'lucide-react';
import { RecurringTransactionForm } from '../features/recurring/components/RecurringTransactionForm';
import { RecurringTransactionCard } from '../features/recurring/components/RecurringTransactionCard';

export function RecurringPage() {
    const { recurringTransactions, loading, addRecurring, updateRecurring, deleteRecurring } = useFinance();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRT, setEditingRT] = useState(null);

    const handleOpenModal = (rt = null) => {
        setEditingRT(rt);
        setIsModalOpen(true);
    };

    const handleToggleActive = async (rt) => {
        try {
            await updateRecurring(rt.id, { isActive: !rt.isActive });
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar esta regla automática?')) {
            try {
                await deleteRecurring(id);
            } catch (error) {
                console.error('Error deleting:', error);
            }
        }
    };

    const handleSubmit = async (formData) => {
        try {
            if (editingRT) {
                await updateRecurring(editingRT.id, formData);
            } else {
                await addRecurring(formData);
            }
            setIsModalOpen(false);
            setEditingRT(null);
        } catch (error) {
            console.error('Error saving recurring transaction:', error);
        }
    };

    return (
        <div className="space-y-10">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Automatización</h2>
                        </div>
                        <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight">Recurrentes</h1>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-6 py-3.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold shadow-xl transition-all active:scale-95 group"
                    >
                        <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                        Nueva Automatización
                    </button>
                </header>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(n => <div key={n} className="h-48 bg-zinc-100 dark:bg-zinc-800 rounded-3xl animate-pulse" />)}
                    </div>
                ) : recurringTransactions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recurringTransactions.map((rt, idx) => (
                            <RecurringTransactionCard
                                key={rt.id}
                                rt={rt}
                                delay={idx * 0.1}
                                onEdit={handleOpenModal}
                                onDelete={handleDelete}
                                onToggle={handleToggleActive}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="glass p-20 rounded-[3rem] text-center space-y-6">
                        <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                            <Clock className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="max-w-xs mx-auto">
                            <h3 className="text-2xl font-black text-zinc-900 dark:text-white">Automatización Vacía</h3>
                            <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">Automatiza tus ingresos y gastos fijos para un control total sin esfuerzo.</p>
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="px-8 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-zinc-900/10 dark:shadow-none"
                        >
                            Crear Mi Primera Regla
                        </button>
                    </div>
                )}

                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={editingRT ? "Editar Automatización" : "Nueva Automatización"}
                >
                    <RecurringTransactionForm
                        rt={editingRT}
                        onSubmit={handleSubmit}
                        onCancel={() => setIsModalOpen(false)}
                    />
                </Modal>
            </div>
    );
}
