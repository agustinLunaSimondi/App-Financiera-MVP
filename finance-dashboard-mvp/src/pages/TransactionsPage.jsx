import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useFinance } from '../hooks/useFinance';
import { useLocalStorage } from '../hooks/useLocalStorage';

import { Card } from '../features/common/components/Card';
import { Search, Filter, Plus, Edit2, Trash2, Wallet, X, Receipt } from 'lucide-react';
import { Modal } from '../features/common/components/Modal';
import { ConfirmDeleteModal } from '../features/common/components/ConfirmDeleteModal';
import { EmptyState } from '../features/common/components/EmptyState';
import { PageHeader } from '../features/common/components/PageHeader';
import { TransactionForm } from '../features/transactions/components/TransactionForm';

import { formatCurrency } from '../utils/formatters';
import { parseApiError } from '../lib/apiErrors';
import { BTN_PRIMARY } from '../lib/formClasses';
import { cn } from '../lib/utils';

export function TransactionsPage() {
    const { transactions, categories, loading, deleteTransaction } = useFinance();
    // Filtros persistentes vía localStorage
    const [searchQuery, setSearchQuery] = useLocalStorage('tx-search', '');
    const [categoryFilter, setCategoryFilter] = useLocalStorage('tx-category', 'all');

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const itemsPerPage = 10;

    // ── Hooks (siempre antes de cualquier return condicional) ──
    // categoryFilter ahora es categoryId — fix de bug donde dos categorías con mismo nombre
    // se mezclaban en el filtro.
    const filteredTransactions = useMemo(() => transactions.filter(tx => {
        const text = (tx.description || tx.name || '').toLowerCase();
        const matchesSearch = text.includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || tx.categoryId === categoryFilter;
        return matchesSearch && matchesCategory;
    }), [transactions, searchQuery, categoryFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));
    const paginatedTransactions = filteredTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset pagination cuando cambia el filtro
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, categoryFilter]);

    // Si la página actual quedó fuera de rango (ej. al borrar), corregir
    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);

    const handleEdit = (tx) => {
        setEditingTransaction(tx);
        setIsModalOpen(true);
    };

    const handleDelete = (id) => setConfirmDeleteId(id);

    const handleConfirmDelete = async () => {
        setDeleting(true);
        try {
            await deleteTransaction(confirmDeleteId);
            toast.success('Transacción eliminada');
            setConfirmDeleteId(null);
        } catch (err) {
            toast.error(parseApiError(err, 'Error al eliminar la transacción'));
        } finally {
            setDeleting(false);
        }
    };

    const transactionToDelete = useMemo(
        () => transactions.find(t => t.id === confirmDeleteId),
        [transactions, confirmDeleteId]
    );

    const hasActiveFilters = searchQuery.trim() !== '' || categoryFilter !== 'all';
    const clearAllFilters = () => {
        setSearchQuery('');
        setCategoryFilter('all');
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTransaction(null);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-12 w-64 glass-card rounded-2xl animate-pulse" />
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-3 h-14 glass-card rounded-2xl animate-pulse" />
                    <div className="h-14 glass-card rounded-2xl animate-pulse" />
                </div>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(n => (
                        <div key={n} className="h-20 glass-card rounded-2xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10">
                <PageHeader
                    section="transactions"
                    icon={Receipt}
                    kicker="Historial"
                    title="Transacciones"
                    subtitle={`${transactions.length} ${transactions.length === 1 ? 'movimiento registrado' : 'movimientos registrados'}`}
                    action={
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className={cn(BTN_PRIMARY, "w-full md:w-auto group py-3.5")}
                        >
                            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                            Nueva Transacción
                        </button>
                    }
                />

                {/* Filters & Search */}
                <div className="space-y-2">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 md:gap-4">
                        <div className="lg:col-span-3 relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar por descripción..."
                                aria-label="Buscar transacciones por descripción"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-10 py-4 glass border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all font-medium"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    aria-label="Limpiar búsqueda"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="relative group">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                aria-label="Filtrar por categoría"
                                className="w-full pl-12 pr-8 py-4 glass border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all font-medium appearance-none"
                            >
                                <option value="all">Todas las categorías</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Filtros activos */}
                    {hasActiveFilters && (
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-zinc-400 font-bold uppercase tracking-widest">Filtros activos:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{filteredTransactions.length} resultados</span>
                            <button
                                type="button"
                                onClick={clearAllFilters}
                                className="ml-auto px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold transition-colors"
                            >
                                Limpiar
                            </button>
                        </div>
                    )}
                </div>

                {/* Mobile: Cards view */}
                <div className="md:hidden space-y-3">
                    {paginatedTransactions.length === 0 ? (
                        filteredTransactions.length === 0 && transactions.length > 0 ? (
                            <EmptyState
                                icon={Search}
                                tone="neutral"
                                title="Sin resultados"
                                description="No encontramos movimientos con los filtros actuales. Probá limpiarlos o ajustar la búsqueda."
                                actionLabel="Limpiar filtros"
                                onAction={clearAllFilters}
                            />
                        ) : (
                            <EmptyState
                                icon={Wallet}
                                tone="primary"
                                title="Tu primera transacción"
                                description="Registrá un gasto o ingreso para empezar a ver tu historial acá."
                                actionLabel="Registrar movimiento"
                                onAction={() => setIsModalOpen(true)}
                            />
                        )
                    ) : paginatedTransactions.map((tx) => (
                        <div key={tx.id} className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl px-4 py-4 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-zinc-900 dark:text-white text-sm truncate">{tx.description || tx.name}</span>
                                    {tx.externalId && <span className="text-[10px] text-sky-500 font-black shrink-0">MP</span>}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 truncate max-w-[10rem]">
                                        {tx.category}
                                    </span>
                                    <span className="text-[10px] text-zinc-400 font-medium shrink-0">
                                        {new Date((tx.transactionDate || tx.date) + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className={`text-sm font-black ${Number(tx.amount) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}>
                                    {formatCurrency(tx.amount)}
                                </span>
                                <div className="flex items-center gap-0.5">
                                    <button
                                        onClick={() => handleEdit(tx)}
                                        aria-label="Editar transacción"
                                        className="p-1.5 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(tx.id)}
                                        aria-label="Eliminar transacción"
                                        className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop: Table view */}
                <div className="hidden md:block">
                {paginatedTransactions.length === 0 ? (
                    filteredTransactions.length === 0 && transactions.length > 0 ? (
                        <EmptyState
                            icon={Search}
                            tone="neutral"
                            title="Sin resultados"
                            description="No encontramos movimientos con los filtros actuales. Probá limpiarlos o ajustar la búsqueda."
                            actionLabel="Limpiar filtros"
                            onAction={clearAllFilters}
                        />
                    ) : (
                        <EmptyState
                            icon={Wallet}
                            tone="primary"
                            title="Sin transacciones todavía"
                            description="Registrá tu primer ingreso o gasto para verlo listado acá."
                            actionLabel="Crear transacción"
                            onAction={() => setIsModalOpen(true)}
                        />
                    )
                ) : (
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
                                {(
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
                                                <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(tx)}
                                                        aria-label="Editar transacción"
                                                        className="p-2 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(tx.id)}
                                                        aria-label="Eliminar transacción"
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
                )}
                </div>

                {/* Pagination Controls */}
                {filteredTransactions.length > 0 && (
                    <div className="px-2 md:px-8 py-4 flex items-center justify-between gap-2">
                        <div className="text-[10px] md:text-xs text-zinc-500 font-bold uppercase tracking-widest">
                            {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredTransactions.length)} de {filteredTransactions.length}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 md:px-4 py-2 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Anterior
                            </button>
                            <span className="text-xs font-medium text-zinc-400 px-2 whitespace-nowrap">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 md:px-4 py-2 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

                <ConfirmDeleteModal
                    isOpen={!!confirmDeleteId}
                    onClose={() => !deleting && setConfirmDeleteId(null)}
                    onConfirm={handleConfirmDelete}
                    title="¿Eliminar transacción?"
                    description="Esta acción no se puede deshacer y afectará el saldo de tu cuenta."
                    itemName={transactionToDelete?.description || transactionToDelete?.name}
                    loading={deleting}
                />
            </div>
    );
}
