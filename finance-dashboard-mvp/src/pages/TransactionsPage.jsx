import React, { useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { Layout } from '../features/common/components/Layout';
import { Card } from '../features/common/components/Card';
import { Search, Filter, Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { Modal } from '../features/common/components/Modal';
import { TransactionForm } from '../features/transactions/components/TransactionForm';
import { cn } from '../lib/utils';

export function TransactionsPage() {
    const { transactions, categories, loading, deleteTransaction } = useFinance();
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);

    const handleEdit = (tx) => {
        setEditingTransaction(tx);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar esta transacción?')) {
            await deleteTransaction(id);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTransaction(null);
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-zinc-500">Cargando transacciones...</div>
                </div>
            </Layout>
        );
    }

    // Filtrar transacciones
    const filteredTransactions = transactions.filter(tx => {
        const matchesSearch = (tx.description || tx.name || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || tx.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <Layout>
            <div className="space-y-10">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Historial</h2>
                        </div>
                        <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight">Transacciones</h1>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold shadow-xl transition-all active:scale-95 group"
                    >
                        <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                        Nueva Transacción
                    </button>
                </header>

                {/* Filters & Search */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-3 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por descripción..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 glass border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all font-medium"
                        />
                    </div>

                    <div className="relative group">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" />
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full pl-12 pr-8 py-4 glass border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all font-medium appearance-none"
                        >
                            <option value="all">Categorías</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Transactions Table */}
                <Card className="overflow-hidden border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-black border-b border-zinc-200/50 dark:border-zinc-800/50">
                                <tr>
                                    <th className="px-8 py-5">Descripción</th>
                                    <th className="px-8 py-5">Categoría</th>
                                    <th className="px-8 py-5">Fecha</th>
                                    <th className="px-8 py-5 text-right">Monto</th>
                                    <th className="px-8 py-5 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
                                {filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-20 text-center text-zinc-400 font-medium">
                                            No se encontraron transacciones
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map((tx) => (
                                        <tr key={tx.id} className="group hover:bg-emerald-500/[0.02] transition-colors">
                                            <td className="px-8 py-5">
                                                <p className="font-bold text-zinc-900 dark:text-white">{tx.description || tx.name}</p>
                                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">{tx.account}</p>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50">
                                                    {tx.category}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-zinc-500 dark:text-zinc-400 font-medium">
                                                {new Date((tx.transactionDate || tx.date) + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                            </td>
                                            <td className={cn(
                                                "px-8 py-5 text-right font-black text-base",
                                                tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'
                                            )}>
                                                {tx.amount > 0 ? '+' : ''}{Number(tx.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(tx)}
                                                        className="p-2 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(tx.id)}
                                                        className="p-2 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination (placeholder) */}
                    {filteredTransactions.length > 0 && (
                        <div className="px-8 py-4 flex items-center justify-between border-t border-zinc-200/50 dark:border-zinc-800/50">
                            <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                                {filteredTransactions.length} items
                            </div>
                            <div className="flex gap-2">
                                <button className="px-4 py-2 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                    Anterior
                                </button>
                                <button className="px-4 py-2 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    )}
                </Card>

                {/* MODAL TRANSACCIÓN */}
                <Modal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    title={editingTransaction ? "Editar Transacción" : "Nueva Transacción"}
                >
                    <TransactionForm
                        onClose={handleCloseModal}
                        transactionToEdit={editingTransaction}
                    />
                </Modal>
            </div>
        </Layout>
    );
}
