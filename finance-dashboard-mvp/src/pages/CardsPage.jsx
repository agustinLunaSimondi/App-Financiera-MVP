import React, { useState } from 'react';
import { useFinance } from '../hooks/useFinance';

import { Card } from '../features/common/components/Card';
import { Plus, CreditCard as CreditCardIcon, Wallet as WalletIcon, Edit2, Trash2, Wallet, CreditCard } from 'lucide-react';
import { Modal } from '../features/common/components/Modal';
import { AccountForm } from '../features/accounts/components/AccountForm';
import { cn } from '../lib/utils';
import { formatCurrency } from '../utils/formatters';

export function CardsPage() {
    const { accounts, loading, deleteAccount } = useFinance();

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);

    const handleEdit = (account) => {
        setEditingAccount(account);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar esta cuenta? Se perderán todas las transacciones asociadas.')) {
            await deleteAccount(id);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAccount(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-zinc-500">Cargando cuentas...</div>
            </div>
        );
    }

    const getAccountIcon = (type) => {
        switch (type) {
            case 'credit':
            case 'CREDIT':
                return CreditCard;
            default:
                return Wallet;
        }
    };

    const getAccountTypeLabel = (type) => {
        switch (type) {
            case 'checking':
            case 'CHECKING':
                return 'Cuenta Corriente';
            case 'savings':
            case 'SAVINGS':
                return 'Ahorros';
            case 'credit':
            case 'CREDIT':
                return 'Tarjeta de Crédito';
            case 'investment':
            case 'INVESTMENT':
                return 'Inversión';
            default:
                return type;
        }
    };

    return (
        <div className="space-y-10">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Billetera</h2>
                        </div>
                        <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight">Cuentas y Tarjetas</h1>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold shadow-xl transition-all active:scale-95 group"
                    >
                        <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                        Nueva Cuenta
                    </button>
                </header>

                {/* Accounts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {accounts.map((account, index) => {
                        const Icon = getAccountIcon(account.type);
                        const isCredit = account.type.toLowerCase() === 'credit';

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

                {/* Summary Card */}
                <div className="glass p-8 rounded-[2.5rem] relative overflow-hidden">
                    <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-black text-zinc-400 mb-2">Total Consolidado</p>
                            <div className="flex items-center gap-4">
                                <div className="text-3xl font-black text-zinc-900 dark:text-white">
                                    {formatCurrency(accounts.reduce((sum, acc) => sum + Number(acc.balance), 0))}
                                </div>
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
                            <div className="flex items-center gap-4">
                                <div className="text-3xl font-black text-zinc-900 dark:text-white">
                                    {formatCurrency(accounts.length > 0 ? accounts.reduce((sum, acc) => sum + Number(acc.balance), 0) / accounts.length : 0)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

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
            </div>
    );
}
