import React, { useState } from 'react';
import { Card } from '../../common/components/Card';
import { Target, TrendingUp, Calendar, MoreVertical, Trash2, Check, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../../utils/formatters';

export function SavingGoalCard({ goal, onEdit, onDelete, onContribute, delay = 0 }) {
    const percentage = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
    const color = goal.color || '#10B981';

    const [depositMode, setDepositMode] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');

    const handleConfirmDeposit = () => {
        const parsed = parseFloat(depositAmount);
        if (isNaN(parsed) || parsed <= 0) {
            // No cerramos el panel si el monto es inválido — damos feedback visual
            return;
        }
        onContribute(goal.id, parsed);
        setDepositMode(false);
        setDepositAmount('');
    };

    const handleCancelDeposit = () => {
        setDepositMode(false);
        setDepositAmount('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirmDeposit();
        } else if (e.key === 'Escape') {
            handleCancelDeposit();
        }
    };

    return (
        <Card className="group relative overflow-hidden" delay={delay}>
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-300"
                        style={{ backgroundColor: `${color}15`, color: color }}
                    >
                        <Target className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-zinc-900 dark:text-white text-lg tracking-tight">{goal.name}</h4>
                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs mt-1">
                            <Calendar className="w-3 h-3" />
                            <span>{goal.deadline ? new Date(goal.deadline + 'T00:00:00').toLocaleDateString() : 'Sin fecha límite'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => onEdit(goal)}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-blue-500"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => onDelete(goal.id)}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-rose-500"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest font-black text-zinc-400 mb-1">Progreso</p>
                        <p className="text-2xl font-black text-zinc-900 dark:text-white">
                            {formatCurrency(goal.currentAmount)}
                            <span className="text-sm font-medium text-zinc-400 ml-1">/ {formatCurrency(goal.targetAmount)}</span>
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-xl font-black" style={{ color: color }}>{percentage}%</span>
                    </div>
                </div>

                <div className="relative h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, delay: delay + 0.3, ease: "easeOut" }}
                        className="absolute top-0 left-0 h-full rounded-full"
                        style={{
                            backgroundColor: color,
                            boxShadow: `0 0 12px ${color}40`
                        }}
                    />
                </div>

                {depositMode ? (
                    <div className="pt-2 flex items-center gap-2">
                        <input
                            type="number"
                            inputMode="decimal"
                            min="0.01"
                            step="0.01"
                            placeholder="Monto a depositar"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            aria-label="Monto a depositar"
                            className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                        <button
                            type="button"
                            onClick={handleConfirmDeposit}
                            disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                            aria-label="Confirmar depósito"
                            className="p-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleCancelDeposit}
                            aria-label="Cancelar depósito"
                            className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 rounded-xl transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="pt-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg text-[11px] font-bold">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>En camino</span>
                        </div>
                        <button
                            onClick={() => setDepositMode(true)}
                            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-xs font-bold hover:scale-105 transition-transform"
                        >
                            Depósito
                        </button>
                    </div>
                )}
            </div>

            {/* Decoración Glass sutil */}
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent blur-2xl rounded-full" />
        </Card>
    );
}
