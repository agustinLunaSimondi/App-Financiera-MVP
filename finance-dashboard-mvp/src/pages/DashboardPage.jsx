import React from 'react';
import { useFinance } from '../hooks/useFinance';

import { KPICard } from '../features/dashboard/components/KPICard';
import { KPIDetailModal } from '../features/dashboard/components/KPIDetailModal';
import { Card } from '../features/common/components/Card';
import { IncomeExpenseChart } from '../features/dashboard/components/charts/IncomeExpenseChart';
import { ExpenseBreakdownChart } from '../features/dashboard/components/charts/ExpenseBreakdownChart';
import { BudgetComparisonChart } from '../features/dashboard/components/charts/BudgetComparisonChart';
import { CashFlowWaterfallChart } from '../features/dashboard/components/charts/CashFlowWaterfallChart';
import { ArrowUpRight, ArrowDownLeft, TrendingUp, TrendingDown, Wallet, PiggyBank, Link2, GraduationCap, Download, Zap, MessageSquare, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import {
    calculateTotalIncome,
    calculateTotalExpenses,
    calculateNetSavings,
    calculateTotalBalance,
    generateIncomeVsExpensesChartData,
    groupTransactionsByCategory,
    projectMonthEndSpend,
    calculateMonthlyBudgetTotal,
    calculateHistoricalMonthlyExpenseAverage,
} from '../utils/calculations';
import { formatCurrency, formatCompactCurrency } from '../utils/formatters';
import { useLanguage } from '../contexts/LanguageContext';
import { AIInsightsCard } from './components/AIInsightsCard';
import { InflationPanel } from '../features/dashboard/components/InflationPanel';
import { ProjectionCard } from '../features/dashboard/components/ProjectionCard';

export function DashboardPage() {
    const { transactions, accounts, budgets, categories, loading, filters, updateFilters, clearFilters } = useFinance();
    const { t } = useLanguage();

    const [quickFilter, setQuickFilter] = React.useState('thisMonth');
    const [detailModal, setDetailModal] = React.useState({ open: false, type: null });

    const openDetail = (type) => setDetailModal({ open: true, type });
    const closeDetail = () => setDetailModal({ open: false, type: null });

    const handleQuickFilter = (type) => {
        setQuickFilter(type);
        const now = new Date();

        if (type === 'all') {
            clearFilters();
            return;
        }

        let startDate = null;
        let endDate = null;

        if (type === 'thisMonth') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        } else if (type === 'last7Days') {
            const date = new Date();
            date.setDate(date.getDate() - 7);
            startDate = date.toISOString().split('T')[0];
            endDate = new Date().toISOString().split('T')[0];
        } else if (type === 'year') {
            startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
            endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
        }

        updateFilters({ startDate, endDate });
    };

    const downloadReport = () => {
        if (!transactions.length) return;

        // Excel-ES interpreta `,` como decimal — usamos `;` como separador y la línea sep= para forzarlo.
        const SEP = ';';
        const csvCell = (val) => {
            const str = (val ?? '').toString();
            if (str.includes('"') || str.includes(SEP) || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const headers = ["Fecha", "Descripción", "Categoría", "Cuenta", "Monto"];
        const rows = transactions.map(tx => [
            new Date((tx.date || tx.transactionDate) + 'T00:00:00').toLocaleDateString('es-AR'),
            tx.description || tx.name,
            tx.category,
            tx.account,
            // Forzar coma decimal AR
            String(tx.amount).replace('.', ','),
        ]);

        // sep=; ayuda a Excel-ES a detectar el separador. BOM UTF-8 para acentos.
        const csvContent = `sep=${SEP}\r\n` + [headers, ...rows].map(row => row.map(csvCell).join(SEP)).join('\r\n');
        const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `reporte_finanzas_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="space-y-10">
                <div className="h-32 glass-card rounded-3xl animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-36 glass-card rounded-2xl animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-80 glass-card rounded-2xl animate-pulse" />
                    <div className="h-80 glass-card rounded-2xl animate-pulse" />
                </div>
            </div>
        );
    }

    // Calcular KPIs
    const totalBalance = calculateTotalBalance(accounts);
    const totalIncome = calculateTotalIncome(transactions);
    const totalExpenses = calculateTotalExpenses(transactions);
    const netSavings = calculateNetSavings(transactions);

    // KPIs data — solo mostrar cambio real si hay datos
    const hasData = transactions.length > 0;
    const hasAccounts = accounts.length > 0;

    // El balance es siempre el saldo actual de las cuentas — no se filtra por fecha.
    // Lo aclaramos en la sublabel para evitar confusión cuando hay filtro activo.
    const hasFilter = !!(filters?.startDate || filters?.endDate);
    const balanceSubtitle = hasFilter ? 'Saldo actual (no afecta filtro)' : (hasAccounts ? (totalBalance >= 0 ? t('onTrack') : '↓ Negativo') : '--');
    const kpiData = [
        {
            label: t('balance'),
            value: formatCompactCurrency(totalBalance),
            change: balanceSubtitle,
            icon: Wallet,
            scheme: 'blue',
            type: 'balance',
            clickable: hasAccounts,
        },
        {
            label: t('income'),
            value: formatCompactCurrency(totalIncome),
            change: hasData ? t('onTrack') : '--',
            icon: TrendingUp,
            scheme: 'emerald',
            type: 'income',
            clickable: hasData,
        },
        {
            label: t('expenses'),
            value: formatCompactCurrency(totalExpenses),
            change: hasData && totalExpenses > 0 ? '↓ Este mes' : '--',
            icon: TrendingDown,
            scheme: 'rose',
            type: 'expenses',
            clickable: hasData && totalExpenses > 0,
        },
        {
            label: t('netSavings'),
            value: formatCompactCurrency(netSavings),
            change: hasData ? (netSavings >= 0 ? t('onTrack') : '↓ Déficit') : '--',
            icon: PiggyBank,
            scheme: 'violet',
            type: 'savings',
            clickable: hasData,
        },
    ];

    const activeKPI = detailModal.type ? kpiData.find(k => k.type === detailModal.type) : null;

    // Proyección fin de mes (#54) — solo cuando vemos el mes actual sin filtro custom.
    const projectionData = quickFilter === 'thisMonth' ? projectMonthEndSpend(transactions) : null;
    const monthlyBudgetTotal = calculateMonthlyBudgetTotal(budgets);
    const historicalAverage = calculateHistoricalMonthlyExpenseAverage(transactions);

    // Generar datos para gráficos
    const incomeVsExpensesData = generateIncomeVsExpensesChartData(transactions, 6);

    // Gastos por categoría
    const expenseTransactions = transactions.filter(tx => tx.amount < 0);
    const expensesByCategory = groupTransactionsByCategory(expenseTransactions);
    const expenseCategoriesData = expensesByCategory.map(cat => {
        const categoryInfo = categories.find(c => c.name === cat.category);
        return {
            name: cat.category,
            value: cat.total,
            color: categoryInfo?.color || '#94a3b8'
        };
    });

    // Budget vs Actual — budgets pueden traer category como objeto o string
    const budgetComparisonData = budgets.map(budget => {
        const categoryName = typeof budget.category === 'object'
            ? budget.category?.name
            : budget.category;
        const spent = expensesByCategory.find(cat => cat.category === categoryName)?.total || 0;
        return {
            category: categoryName || 'Sin categoría',
            budget: budget.amount,
            actual: spent
        };
    });

    // Datos para cascada (simplificados por ahora)
    const waterfallData = [
        { name: 'Ingresos', value: totalIncome, fill: '#10b981' },
        { name: 'Gastos', value: -totalExpenses, fill: '#ef4444' },
        { name: 'Ahorro', value: netSavings, fill: '#3b82f6', isTotal: true },
    ];

    // Transacciones recientes (últimas 5)
    const recentTransactions = [...transactions]
        .sort((a, b) => new Date((b.date || b.transactionDate) + 'T00:00:00') - new Date((a.date || a.transactionDate) + 'T00:00:00'))
        .slice(0, 5);

    const isDashboardEmpty = transactions.length === 0;

    return (
        <div className="space-y-10">
                {/* Onboarding Banner for Empty Dashboard */}
                {isDashboardEmpty && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="relative overflow-hidden bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-600/10 border border-emerald-500/20 dark:border-emerald-500/10 rounded-3xl p-6 md:p-8 shadow-xl"
                    >
                        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                            <div className="space-y-2 max-w-2xl">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                    🚀 ¡Bienvenido a Vuelto!
                                </div>
                                <h2 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                                    Comenzá a tomar el control de tu plata
                                </h2>
                                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                    Parece que todavía no registraste ningún movimiento. Podés importar tus datos desde Mercado Pago, agregar movimientos de forma manual, o hablar directamente con <strong className="text-emerald-600 dark:text-emerald-400">Aki</strong>, tu asistente de IA.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto shrink-0">
                                <Link
                                    to="/chat"
                                    className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all w-full sm:w-auto"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    Charlar con Aki (AI)
                                </Link>
                                <Link
                                    to="/integrations"
                                    className="flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200/50 dark:border-zinc-700/50 rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all w-full sm:w-auto shadow-sm"
                                >
                                    <Link2 className="w-4 h-4 text-blue-500" />
                                    Conectar Mercado Pago
                                </Link>
                            </div>
                        </div>
                        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                    </motion.div>
                )}

                {/* Hero Section */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 md:p-8 glass-card rounded-3xl">
                        <div className="space-y-2">
                             <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest"
                            >
                                <Zap className="w-3 h-3 fill-current" /> {t('dashboard.online')}
                            </motion.div>
                            <h1 className="text-2xl md:text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter">
                                {t('dashboard.title')} <span className="premium-gradient-text">Vuelto</span>
                            </h1>
                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 max-w-md">
                                {t('dashboard.subtitle')}
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                            <button
                                onClick={downloadReport}
                                disabled={!hasData}
                                title={!hasData ? 'Necesitás registrar movimientos para descargar' : undefined}
                                className={cn(
                                    "flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-xl",
                                    hasData
                                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:scale-105 active:scale-95 shadow-zinc-900/10 dark:shadow-zinc-100/5"
                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed shadow-none"
                                )}
                            >
                                <Download className="w-4 h-4" />
                                {t('dashboard.download')}
                            </button>
                            <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 overflow-x-auto scrollbar-hide">
                                {[
                                    { id: 'thisMonth', label: t('dashboard.thisMonth') },
                                    { id: 'last7Days', label: t('dashboard.last7Days') },
                                    { id: 'year', label: t('dashboard.thisYear') },
                                    { id: 'all', label: t('dashboard.allTime') }
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleQuickFilter(item.id)}
                                        className={cn(
                                            "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0",
                                            quickFilter === item.id
                                                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                                                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                        )}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {kpiData.map((kpi, idx) => (
                        <KPICard
                            key={kpi.type}
                            label={kpi.label}
                            value={kpi.value}
                            change={kpi.change}
                            icon={kpi.icon}
                            scheme={kpi.scheme}
                            delay={idx * 0.1}
                            onClick={kpi.clickable ? () => openDetail(kpi.type) : undefined}
                        />
                    ))}
                </div>

                {projectionData && projectionData.spentToDate > 0 && (
                    <ProjectionCard
                        projectionData={projectionData}
                        monthlyBudgetTotal={monthlyBudgetTotal}
                        historicalAverage={historicalAverage}
                    />
                )}

                <InflationPanel />

                <AIInsightsCard />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between bg-white dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 rounded-2xl px-5 py-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <Link2 className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Mercado Pago</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Conectá para importar gastos automáticamente</p>
                            </div>
                        </div>
                        <Link
                            to="/integrations"
                            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            Conectar <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <div className="flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-200/50 dark:border-purple-800/50 rounded-2xl px-5 py-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                <GraduationCap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Academia Financiera</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Aprendé TNA, Plazo Fijo, diversificación y más</p>
                            </div>
                        </div>
                        <Link
                            to="/academy"
                            className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                        >
                            Explorar <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card title="Evolución mensual" className="lg:col-span-2" subtitle="Ingresos vs. gastos en los últimos meses" delay={0.4}>
                        <div className="h-[300px]">
                            <IncomeExpenseChart data={incomeVsExpensesData} />
                        </div>
                    </Card>
                    <Card className="lg:col-span-1" title="Distribución de gastos" subtitle="Por categoría — mes actual" delay={0.5}>
                        <div className="h-[300px]">
                            <ExpenseBreakdownChart data={expenseCategoriesData} />
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-1" title="Presupuestos" subtitle="Gasto real vs. límite mensual" delay={0.6}>
                        <div className="h-[300px]">
                            <BudgetComparisonChart data={budgetComparisonData} />
                        </div>
                    </Card>
                    <Card className="lg:col-span-2" title="Flujo de dinero" subtitle="De dónde vienen tus ingresos y a dónde va tu plata" delay={0.7}>
                        <div className="h-[300px]">
                            <CashFlowWaterfallChart data={waterfallData} />
                        </div>
                    </Card>
                </div>

                {/* Recent Transactions */}
                <Card title="Transacciones Recientes" subtitle="Tu última actividad financiera" delay={0.8}>
                    {recentTransactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center bg-zinc-50/50 dark:bg-zinc-800/10 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800/50">
                            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mb-3">
                                <Wallet className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                            </div>
                            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No hay movimientos recientes</h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs px-4">
                                Tus ingresos, gastos y transferencias aparecerán listados acá a medida que los vayas registrando.
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                                <Link
                                    to="/transactions"
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-xs font-bold transition-transform active:scale-95"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Registrar movimiento
                                </Link>
                                <Link
                                    to="/chat"
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-500/20 transition-colors"
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Hablar con Aki
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Mobile: lista compacta */}
                            <div className="md:hidden space-y-2">
                                {recentTransactions.map((tx) => {
                                    const isIncome = Number(tx.amount) > 0;
                                    return (
                                    <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-100 dark:bg-emerald-500/15' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                                            {isIncome
                                                ? <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                : <ArrowDownLeft className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{tx.description || tx.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium">{tx.category}</span>
                                                <span className="text-[10px] text-zinc-400">{new Date((tx.date || tx.transactionDate) + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>
                                            </div>
                                        </div>
                                        <span className={`text-sm font-black shrink-0 ${Number(tx.amount) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                            {formatCurrency(tx.amount)}
                                        </span>
                                    </div>
                                );})}
                            </div>
                            {/* Desktop: tabla */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50">
                                        <tr>
                                            <th className="px-6 py-3 rounded-l-lg">Transacción</th>
                                            <th className="px-6 py-3">Categoría</th>
                                            <th className="px-6 py-3">Fecha</th>
                                            <th className="px-6 py-3 rounded-r-lg text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentTransactions.map((tx) => {
                                            const isIncome = Number(tx.amount) > 0;
                                            return (
                                            <tr key={tx.id} className="bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isIncome ? 'bg-emerald-100 dark:bg-emerald-500/15' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                                                        {isIncome
                                                            ? <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                            : <ArrowDownLeft className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                                                        }
                                                    </div>
                                                    {tx.description || tx.name}
                                                </td>
                                                <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                                        {tx.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                                                    {new Date((tx.date || tx.transactionDate) + 'T00:00:00').toLocaleDateString('es-AR')}
                                                </td>
                                                <td className={`px-6 py-4 text-right font-medium ${Number(tx.amount) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                                    {formatCurrency(tx.amount)}
                                                </td>
                                            </tr>
                                        );})}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </Card>

                <KPIDetailModal
                    isOpen={detailModal.open}
                    onClose={closeDetail}
                    type={detailModal.type}
                    value={activeKPI?.value}
                    transactions={transactions}
                    accounts={accounts}
                />
            </div>
    );
}
