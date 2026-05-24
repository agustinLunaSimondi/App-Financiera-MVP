import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useFinance } from '../hooks/useFinance';

import { Modal } from '../features/common/components/Modal';
import { ConfirmDeleteModal } from '../features/common/components/ConfirmDeleteModal';
import { EmptyState } from '../features/common/components/EmptyState';
import { PageHeader } from '../features/common/components/PageHeader';
import { Plus, Clock } from 'lucide-react';
import { RecurringTransactionForm } from '../features/recurring/components/RecurringTransactionForm';
import { RecurringTransactionCard } from '../features/recurring/components/RecurringTransactionCard';
import { SubscriptionSuggestionsBanner } from '../features/recurring/components/SubscriptionSuggestionsBanner';
import { parseApiError } from '../lib/apiErrors';
import { BTN_PRIMARY } from '../lib/formClasses';
import { cn } from '../lib/utils';

export function RecurringPage() {
    const { recurringTransactions, loading, addRecurring, updateRecurring, deleteRecurring, refreshData } = useFinance();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRT, setEditingRT] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const handleOpenModal = (rt = null) => {
        setEditingRT(rt);
        setIsModalOpen(true);
    };

    const handleToggleActive = async (rt) => {
        try {
            await updateRecurring(rt.id, { isActive: !rt.isActive });
            toast.success(rt.isActive ? 'Regla pausada' : 'Regla activada');
        } catch (error) {
            console.error('Error toggling status:', error);
            toast.error(parseApiError(error, 'Error al cambiar estado'));
        }
    };

    const handleDelete = (id) => setConfirmDeleteId(id);

    const handleConfirmDelete = async () => {
        setDeleting(true);
        try {
            await deleteRecurring(confirmDeleteId);
            toast.success('Regla eliminada');
            setConfirmDeleteId(null);
        } catch (error) {
            console.error('Error deleting:', error);
            toast.error(parseApiError(error, 'Error al eliminar la regla'));
        } finally {
            setDeleting(false);
        }
    };

    const handleSubmit = async (formData) => {
        try {
            if (editingRT) {
                await updateRecurring(editingRT.id, formData);
                toast.success('Regla actualizada correctamente');
            } else {
                await addRecurring(formData);
                toast.success('Regla creada correctamente');
            }
            setIsModalOpen(false);
            setEditingRT(null);
        } catch (error) {
            console.error('Error saving recurring transaction:', error);
            toast.error(parseApiError(error, 'Error al guardar la regla'));
        }
    };

    const ruleToDelete = useMemo(
        () => recurringTransactions.find(r => r.id === confirmDeleteId),
        [recurringTransactions, confirmDeleteId]
    );

    return (
        <div className="space-y-10">
                <PageHeader
                    section="recurring"
                    icon={Clock}
                    kicker="Automatización"
                    title="Recurrentes"
                    subtitle={
                        recurringTransactions.length === 0
                            ? "Automatizá ingresos y gastos fijos (sueldo, alquiler, suscripciones) para no tener que registrarlos manualmente."
                            : `${recurringTransactions.length} ${recurringTransactions.length === 1 ? 'regla configurada' : 'reglas configuradas'} — ${recurringTransactions.filter(r => r.isActive).length} activas`
                    }
                    action={
                        <button
                            type="button"
                            onClick={() => handleOpenModal()}
                            className={cn(BTN_PRIMARY, "w-full md:w-auto group py-3.5")}
                        >
                            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                            Nueva Automatización
                        </button>
                    }
                />

                <SubscriptionSuggestionsBanner onSuggestionsConverted={refreshData} />

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(n => <div key={n} className="h-48 bg-zinc-100 dark:bg-zinc-800/50 rounded-3xl animate-pulse" />)}
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
                    <EmptyState
                        icon={Clock}
                        tone="info"
                        title="Sin automatizaciones"
                        description="Sueldo, alquiler, Netflix, gym... configurálos una sola vez y se registran solos cada mes."
                        actionLabel="Crear primera regla"
                        onAction={() => handleOpenModal()}
                    />
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

                <ConfirmDeleteModal
                    isOpen={!!confirmDeleteId}
                    onClose={() => !deleting && setConfirmDeleteId(null)}
                    onConfirm={handleConfirmDelete}
                    title="¿Eliminar esta regla?"
                    description="No se seguirán generando transacciones automáticas para esta regla."
                    itemName={ruleToDelete?.description || ruleToDelete?.name}
                    loading={deleting}
                />
            </div>
    );
}
