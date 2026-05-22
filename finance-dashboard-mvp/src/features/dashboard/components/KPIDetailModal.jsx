import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, Wallet, TrendingUp, TrendingDown, PiggyBank, ChevronRight, Sparkles } from 'lucide-react';
import { Modal } from '../../common/components/Modal';
import { formatCurrency, formatCompactCurrency } from '../../../utils/formatters';

const schemes = {
    balance: { icon: Wallet, color: 'blue', label: 'Balance Total' },
    income: { icon: TrendingUp, color: 'emerald', label: 'Ingresos' },
    expenses: { icon: TrendingDown, color: 'rose', label: 'Gastos' },
    savings: { icon: PiggyBank, color: 'violet', label: 'Ahorro Neto' },
};

const colorClasses = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', accent: 'bg-blue-500' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', accent: 'bg-emerald-500' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', accent: 'bg-rose-500' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', accent: 'bg-violet-500' },
};

export function KPIDetailModal({ isOpen, onClose, type, value, transactions = [], accounts = [] }) {
    const config = schemes[type];

    const { filteredItems, breakdown, displayMode } = useMemo(() => {
        if (!type) return { filteredItems: [], breakdown: null, displayMode: 'transactions' };

        if (type === 'balance') {
            const sortedAccounts = [...accounts].sort((a, b) => Number(b.balance) - Number(a.balance));
            return { filteredItems: sortedAccounts, breakdown: null, displayMode: 'accounts' };
        }

        if (type === 'income') {
            const items = transactions
                .filter(tx => Number(tx.amount) > 0)
                .sort((a, b) => Number(b.amount) - Number(a.amount));

            const byCategory = {};
            items.forEach(tx => {
                const cat = tx.category || 'Sin categoría';
                byCategory[cat] = (byCategory[cat] || 0) + Number(tx.amount);
            });
            return {
                filteredItems: items,
                breakdown: Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 3),
                displayMode: 'transactions'
            };
        }

        if (type === 'expenses') {
            const items = transactions
                .filter(tx => Number(tx.amount) < 0)
                .sort((a, b) => Number(a.amount) - Number(b.amount));

            const byCategory = {};
            items.forEach(tx => {
                const cat = tx.category || 'Sin categoría';
                byCategory[cat] = (byCategory[cat] || 0) + Math.abs(Number(tx.amount));
            });
            return {
                filteredItems: items,
                breakdown: Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 3),
                displayMode: 'transactions'
            };
        }

        if (type === 'savings') {
            return { filteredItems: [], breakdown: null, displayMode: 'savings' };
        }

        return { filteredItems: [], breakdown: null, displayMode: 'transactions' };
    }, [type, transactions, accounts]);

    if (!config) return null;

    const Icon = config.icon;
    const colors = colorClasses[config.color];

    const totalIncome = transactions.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
    const totalExpenses = Math.abs(transactions.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Number(t.amount), 0));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={null}>
            <div className="space-y-5 -mt-2">
                {/* Hero del modal */}
                <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-7 h-7 ${colors.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
                            {config.label}
                        </p>
                        <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mt-1">
                            {value}
                        </p>
                        {displayMode === 'transactions' && (
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">
                                {filteredItems.length} {filteredItems.length === 1 ? 'movimiento' : 'movimientos'} en el período
                            </p>
                        )}
                        {displayMode === 'accounts' && (
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">
                                Distribuido en {filteredItems.length} {filteredItems.length === 1 ? 'cuenta' : 'cuentas'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Top categorías (para ingresos y gastos) */}
                {breakdown && breakdown.length > 0 && (
                    <div className={`${colors.bg} rounded-2xl p-4 space-y-2.5`}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                            Top categorías
                        </p>
                        {breakdown.map(([cat, total]) => {
                            const pct = type === 'income'
                                ? (totalIncome > 0 ? (total / totalIncome) * 100 : 0)
                                : (totalExpenses > 0 ? (total / totalExpenses) * 100 : 0);
                            return (
                                <div key={cat} className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className={`w-1.5 h-1.5 rounded-full ${colors.accent}`} />
                                        <span className="text-sm font-bold text-zinc-900 dark:text-white truncate">{cat}</span>
                                        <span className="text-[10px] font-bold text-zinc-400 shrink-0">{pct.toFixed(0)}%</span>
                                    </div>
                                    <span className="text-sm font-black text-zinc-900 dark:text-white shrink-0">
                                        {formatCompactCurrency(total)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Breakdown de ahorro */}
                {displayMode === 'savings' && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-emerald-500/10 rounded-2xl p-4">
                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-2">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Ingresos</span>
                                </div>
                                <p className="text-lg font-black text-zinc-900 dark:text-white">
                                    {formatCompactCurrency(totalIncome)}
                                </p>
                            </div>
                            <div className="bg-rose-500/10 rounded-2xl p-4">
                                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 mb-2">
                                    <TrendingDown className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Gastos</span>
                                </div>
                                <p className="text-lg font-black text-zinc-900 dark:text-white">
                                    {formatCompactCurrency(totalExpenses)}
                                </p>
                            </div>
                        </div>
                        <div className={`${colors.bg} rounded-2xl p-4 flex items-center gap-3`}>
                            <Sparkles className={`w-5 h-5 ${colors.text}`} />
                            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                {totalIncome - totalExpenses >= 0
                                    ? `Estás ahorrando un ${totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0}% de tus ingresos.`
                                    : 'Estás gastando más de lo que ingresás. Revisá tus presupuestos.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Listado de cuentas */}
                {displayMode === 'accounts' && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 px-1">
                            Cuentas
                        </p>
                        {filteredItems.length === 0 ? (
                            <EmptyDetail
                                title="Sin cuentas registradas"
                                description="Agregá una cuenta para empezar a trackear tu balance."
                                actionLabel="Ir a Cuentas"
                                actionTo="/cards"
                                onClose={onClose}
                            />
                        ) : (
                            filteredItems.map(acc => (
                                <div key={acc.id} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl">
                                    <div className={`w-9 h-9 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
                                        <Wallet className={`w-4 h-4 ${colors.text}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{acc.name}</p>
                                        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mt-0.5">
                                            {acc.type || 'Cuenta'}
                                        </p>
                                    </div>
                                    <span className={`text-sm font-black shrink-0 ${Number(acc.balance) >= 0 ? 'text-zinc-900 dark:text-white' : 'text-rose-500'}`}>
                                        {formatCurrency(acc.balance)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Listado de transacciones */}
                {displayMode === 'transactions' && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 px-1">
                            Movimientos
                        </p>
                        {filteredItems.length === 0 ? (
                            <EmptyDetail
                                title={type === 'income' ? 'Sin ingresos en el período' : 'Sin gastos en el período'}
                                description={type === 'income'
                                    ? 'Registrá tu primer ingreso para ver el detalle acá.'
                                    : 'Registrá tu primer gasto para ver el detalle acá.'}
                                actionLabel="Registrar movimiento"
                                actionTo="/transactions"
                                onClose={onClose}
                            />
                        ) : (
                            <div className="max-h-[40vh] overflow-y-auto space-y-1.5 -mr-2 pr-2">
                                {filteredItems.slice(0, 50).map(tx => {
                                    const isIncome = Number(tx.amount) > 0;
                                    return (
                                        <div key={tx.id} className="flex items-center gap-3 p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 rounded-xl transition-colors">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                                                {isIncome
                                                    ? <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                    : <ArrowDownLeft className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                                                    {tx.description || tx.name || 'Sin descripción'}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                                        {tx.category || 'Otros'}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-400">
                                                        {new Date((tx.date || tx.transactionDate) + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className={`text-sm font-black shrink-0 ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}>
                                                {formatCurrency(tx.amount)}
                                            </span>
                                        </div>
                                    );
                                })}
                                {filteredItems.length > 50 && (
                                    <p className="text-[10px] text-zinc-400 text-center py-2">
                                        Mostrando los primeros 50 de {filteredItems.length}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* CTA al final */}
                {(displayMode === 'transactions' || displayMode === 'savings') && filteredItems.length > 0 && (
                    <Link
                        to="/transactions"
                        onClick={onClose}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                    >
                        Ver historial completo <ChevronRight className="w-4 h-4" />
                    </Link>
                )}
            </div>
        </Modal>
    );
}

function EmptyDetail({ title, description, actionLabel, actionTo, onClose }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-center bg-zinc-50/50 dark:bg-zinc-800/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700/50">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                <Wallet className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{title}</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[260px] px-4">{description}</p>
            {actionLabel && actionTo && (
                <Link
                    to={actionTo}
                    onClick={onClose}
                    className="mt-4 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-xs font-bold transition-transform active:scale-95"
                >
                    {actionLabel}
                </Link>
            )}
        </div>
    );
}
