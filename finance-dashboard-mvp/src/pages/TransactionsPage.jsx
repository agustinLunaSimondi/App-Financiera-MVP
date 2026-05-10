import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useFinance } from '../hooks/useFinance';

import { Card } from '../features/common/components/Card';
import { Search, Filter, Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { Modal } from '../features/common/components/Modal';
import { TransactionForm } from '../features/transactions/components/TransactionForm';
import { cn } from '../lib/utils';

import { formatCurrency } from '../utils/formatters';

export function TransactionsPage() {
    const { transactions, categories, loading, deleteTransaction } = useFinance();
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const handleEdit = (tx) => {
        setEditingTransaction(tx);
        setIsModalOpen(true);
    };

    const handleDelete = (id) => setConfirmDeleteId(id);

    const handleConfirmDelete = async () => {
        try {
            await deleteTransaction(confirmDeleteId);
            toast.success('Transacción eliminada');
        } catch {
            toast.error('Error al eliminar la transacción');
        } finally {
            setConfirmDeleteId(null);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTransaction(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-zinc-500">Cargando transacciones...</div>
            </div>
        );
    }

    // Filtrar transacciones
    const filteredTransactions = transactions.filter(tx => {
        const matchesSearch = (tx.description || tx.name || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || tx.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    // Pagination logic
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = filteredTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset pagination when filter changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, categoryFilter]);

    return (
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
                        <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">Transacciones</h1>
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

                {/* Mobile: Cards view */}
                <div className="md:hidden space-y-3">
                    {paginatedTransactions.length === 0 ? (
                        <div className="py-16 text-center text-zinc-400 font-medium">
                            No se encontraron transacciones
                        </div>
                    ) : paginatedTransactions.map((tx) => (
                        <div key={tx.id} className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl px-4 py-4 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-zinc-900 dark:text-white text-sm truncate">{tx.description || tx.name}</span>
                                    {tx.externalId && <span className="text-[10px] text-sky-500 font-black shrink-0">MP</span>}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                        {tx.category}
                                    </span>
                                    <span className="text-[10px] text-zinc-400 font-medium">
                                        {new Date((tx.transactionDate || tx.date) + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <span className={`text-sm font-black mr-2 ${Number(tx.amount) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}>
                                    {formatCurrency(tx.amount)}
                                </span>
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
                        </div>
                    ))}
                </div>

                {/* Desktop: Table view */}
                <Card className="hidden md:block overflow-hidden border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl">
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
                                {paginatedTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-20 text-center text-zinc-400 font-medium">
                                            No se encontraron transacciones
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedTransactions.map((tx) => (
                                        <tr key={tx.id} className="group hover:bg-emerald-500/[0.02] transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-zinc-900 dark:text-white">{tx.description || tx.name}</span>
                                                    {tx.externalId && (
                                                        <span className="text-[10px] text-sky-500 font-bold flex items-center gap-1 mt-0.5">
                                                            MP
                                                        </span>
                                                    )}
                                                </div>
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
                                            <td className={`px-8 py-5 text-right font-medium ${
                                                Number(tx.amount) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'
                                            }`}>
                                                {formatCurrency(tx.amount)}
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
                </Card>

                {/* Pagination Controls */}
                {filteredTransactions.length > 0 && (
                    <div className="px-2 md:px-8 py-4 flex items-center justify-between">
                        <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                            {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredTransactions.length)} de {filteredTransactions.length}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Anterior
                            </button>
                            <span className="text-xs font-medium text-zinc-400 px-2">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}

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

                {/* Confirm delete banner */}
                {confirmDeleteId && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-sm">
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl shadow-zinc-900/20 p-4 flex items-center gap-4">
                            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-zinc-900 dark:text-white">¿Eliminar transacción?</p>
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
