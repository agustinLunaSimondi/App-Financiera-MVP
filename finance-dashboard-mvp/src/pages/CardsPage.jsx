import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useFinance } from '../hooks/useFinance';

import { Card } from '../features/common/components/Card';
import { Plus, Edit2, Trash2, Wallet, CreditCard } from 'lucide-react';
import { Modal } from '../features/common/components/Modal';
import { ConfirmDeleteModal } from '../features/common/components/ConfirmDeleteModal';
import { EmptyState } from '../features/common/components/EmptyState';
import { PageHeader } from '../features/common/components/PageHeader';
import { AccountForm } from '../features/accounts/components/AccountForm';
import { cn } from '../lib/utils';
import { formatCurrency } from '../utils/formatters';
import { parseApiError } from '../lib/apiErrors';
import { BTN_PRIMARY } from '../lib/formClasses';

// Helpers seguros — evitan NaN y crashes con datos parciales
const safeBalance = (acc) => {
    const n = Number(acc?.balance);
    return Number.isFinite(n) ? n : 0;
};
const safeType = (type) => (type ?? '').toString().toLowerCase();

export function CardsPage() {
    const { accounts, loading, deleteAccount } = useFinance();

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const handleEdit = (account) => {
        setEditingAccount(account);
        setIsModalOpen(true);
    };

    const handleDelete = (id) => setConfirmDeleteId(id);

    const handleConfirmDelete = async () => {
        setDeleting(true);
        try {
            await deleteAccount(confirmDeleteId);
            toast.success('Cuenta eliminada');
            setConfirmDeleteId(null);
        } catch (err) {
            toast.error(parseApiError(err, 'No se pudo eliminar la cuenta'));
        } finally {
            setDeleting(false);
        }
    };

    const accountToDelete = useMemo(
        () => accounts.find(a => a.id === confirmDeleteId),
        [accounts, confirmDeleteId]
    );

    const totalBalance = useMemo(
        () => accounts.reduce((sum, acc) => sum + safeBalance(acc), 0),
        [accounts]
    );
    const avgBalance = accounts.length > 0 ? totalBalance / accounts.length : 0;
    const isNegativeTotal = totalBalance < 0;

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAccount(null);
    };

    if (loading) {
        return (
            <div className="space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-3">
                        <div className="h-4 w-24 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-md animate-pulse" />
                        <div className="h-9 w-56 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-xl animate-pulse" />
                    </div>
                    <div className="h-14 w-full md:w-44 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-2xl animate-pulse" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(n => (
                        <div key={n} className="h-56 bg-zinc-100 dark:bg-zinc-800/50 rounded-3xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    const getAccountIcon = (type) => safeType(type) === 'credit' ? CreditCard : Wallet;

    const getAccountTypeLabel = (type) => {
        const t = safeType(type);
        switch (t) {
            case 'checking': return 'Cuenta Corriente';
            case 'savings': return 'Ahorros';
            case 'credit': return 'Tarjeta de Crédito';
            case 'investment': return 'Inversión';
            case 'cash': return 'Efectivo';
            default: return type || 'Cuenta';
        }
    };

    return (
        <div className="space-y-10">
                <PageHeader
                    section="cards"
                    icon={CreditCard}
                    kicker="Billetera"
                    title="Cuentas y Tarjetas"
                    subtitle={
                        accounts.length === 0
                            ? "Agregá las cuentas y tarjetas que usás en tu día a día para trackear el saldo total."
                            : `${accounts.length} ${accounts.length === 1 ? 'cuenta activa' : 'cuentas activas'} — ${formatCurrency(totalBalance)} consolidado`
                    }
                    action={
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className={cn(BTN_PRIMARY, "w-full md:w-auto group py-3.5")}
                        >
                            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                            Nueva Cuenta
                        </button>
                    }
                />

                {accounts.length === 0 && (
                    <EmptyState
                        icon={Wallet}
                        tone="info"
                        title="Sin cuentas todavía"
                        description="Creá tu primera cuenta (efectivo, débito, crédito o ahorros) para empezar a registrar movimientos."
                        actionLabel="Crear primera cuenta"
                        onAction={() => setIsModalOpen(true)}
                    />
                )}

                {/* Accounts Grid */}
                {accounts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {accounts.map((account, index) => {
                        const Icon = getAccountIcon(account.type);
                        const isCredit = safeType(account.type) === 'credit';

                        return (
                            <Card key={account.id} className="group relative overflow-hidden" delay={index * 0.1}>
                                <div className="relative z-10 space-y-8">
                                    <div className="flex justify-between items-start">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-300",
                                            isCredit ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-emerald-500 text-white"
                                        )}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleEdit(account)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-emerald-500">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(account.id)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-rose-500">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-black text-zinc-900 dark:text-white text-xl tracking-tight">{account.name}</h3>
                                        <p className="text-[10px] uppercase tracking-widest font-black text-zinc-400 mt-1">{getAccountTypeLabel(account.type)}</p>
                                    </div>

                                    <div className="pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50 flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-widest font-black text-zinc-400 mb-1">Saldo Disponible</p>
                                            <div className={cn(
                                                "text-2xl font-black",
                                                Number(account.balance) < 0 ? "text-rose-500" : "text-zinc-900 dark:text-white"
                                            )}>
                                                {formatCurrency(account.balance)}
                                                <span className="text-xs font-bold text-zinc-400 ml-1.5 uppercase">{account.currency}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Decoración Glass sutil */}
                                <div className={cn(
                                    "absolute -bottom-6 -right-6 w-32 h-32 blur-3xl rounded-full opacity-20",
                                    isCredit ? "bg-zinc-500" : "bg-emerald-500"
                                )} />
                            </Card>
                        );
                    })}
                </div>
                )}

                {/* Summary Card */}
                {accounts.length > 0 && (
                <div className="glass p-8 rounded-[2.5rem] relative overflow-hidden">
                    <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-black text-zinc-400 mb-2">Total Consolidado</p>
                            <div className={cn(
                                "text-3xl font-black",
                                isNegativeTotal ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-white"
                            )}>
                                {formatCurrency(totalBalance)}
                            </div>
                        </div>
                        <div className="sm:border-l sm:border-zinc-200/50 dark:sm:border-zinc-800/50 sm:pl-8">
                            <p className="text-[10px] uppercase tracking-widest font-black text-zinc-400 mb-2">Cuentas Activas</p>
                            <p className="text-3xl font-black text-zinc-900 dark:text-white">
                                {accounts.length}
                            </p>
                        </div>
                        <div className="sm:border-l sm:border-zinc-200/50 dark:sm:border-zinc-800/50 sm:pl-8">
                            <p className="text-[10px] uppercase tracking-widest font-black text-zinc-400 mb-2">Promedio p/ Cuenta</p>
                            <div className={cn(
                                "text-3xl font-black",
                                avgBalance < 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-white"
                            )}>
                                {formatCurrency(avgBalance)}
                            </div>
                        </div>
                    </div>
                </div>
                )}

                {/* MODAL CUENTA */}
                <Modal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    title={editingAccount ? "Editar Cuenta" : "Nueva Cuenta"}
                >
                    <AccountForm
                        onClose={handleCloseModal}
                        accountToEdit={editingAccount}
                    />
                </Modal>

                <ConfirmDeleteModal
                    isOpen={!!confirmDeleteId}
                    onClose={() => !deleting && setConfirmDeleteId(null)}
                    onConfirm={handleConfirmDelete}
                    title="¿Eliminar esta cuenta?"
                    description="Se perderán todas las transacciones asociadas a esta cuenta."
                    itemName={accountToDelete?.name}
                    loading={deleting}
                />
            </div>
    );
}
