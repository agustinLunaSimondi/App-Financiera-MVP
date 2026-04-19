import React from 'react';
import { useFinance } from '../hooks/useFinance';
import { Layout } from '../features/common/components/Layout';
import { KPICard } from '../features/dashboard/components/KPICard';
import { Card } from '../features/common/components/Card';
import { IncomeExpenseChart } from '../features/dashboard/components/charts/IncomeExpenseChart';
import { ExpenseBreakdownChart } from '../features/dashboard/components/charts/ExpenseBreakdownChart';
import { BudgetComparisonChart } from '../features/dashboard/components/charts/BudgetComparisonChart';
import { CashFlowWaterfallChart } from '../features/dashboard/components/charts/CashFlowWaterfallChart';
import { ArrowUpRight, TrendingUp, TrendingDown, Wallet, PiggyBank, Calendar, Link2, GraduationCap, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import {
    calculateTotalIncome,
    calculateTotalExpenses,
    calculateNetSavings,
    calculateTotalBalance,
    generateIncomeVsExpensesChartData,
    groupTransactionsByCategory,
    calculatePercentageChange
} from '../utils/calculations';

export function DashboardPage() {
    const { transactions, accounts, budgets, categories, loading, filters, updateFilters, clearFilters } = useFinance();

    const [quickFilter, setQuickFilter] = React.useState('thisMonth');

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

        const headers = ["Fecha", "Descripción", "Categoría", "Cuenta", "Monto"];
        const rows = transactions.map(tx => [
            new Date(tx.date || tx.transactionDate).toLocaleDateString(),
            tx.description || tx.name,
            tx.category,
            tx.account,
            tx.amount
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `reporte_finanzas_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-zinc-500">Cargando datos...</div>
                </div>
            </Layout>
        );
    }

    // Calcular KPIs
    const totalBalance = calculateTotalBalance(accounts);
    const totalIncome = calculateTotalIncome(transactions);
    const totalExpenses = calculateTotalExpenses(transactions);
    const netSavings = calculateNetSavings(transactions);

    // KPIs data
    const kpiData = [
        {
            label: 'Balance Total',
            value: `$${totalBalance.toFixed(2)}`,
            change: '+2.5%',
            type: 'positive',
            icon: Wallet
        },
        {
            label: 'Ingresos Mensuales',
            value: `$${totalIncome.toFixed(2)}`,
            change: 'En camino',
            type: 'neutral',
            icon: TrendingUp
        },
        {
            label: 'Gastos Mensuales',
            value: `$${totalExpenses.toFixed(2)}`,
            change: '-4.1%',
            type: 'positive',
            icon: TrendingDown
        },
        {
            label: 'Ahorro Neto',
            value: `$${netSavings.toFixed(2)}`,
            change: '+12%',
            type: 'positive',
            icon: PiggyBank
        },
    ];

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

    // Budget vs Actual
    const budgetComparisonData = budgets.map(budget => {
        const spent = expensesByCategory.find(cat => cat.category === budget.category)?.total || 0;
        return {
            category: budget.category,
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

    return (
        <Layout>
            <div className="space-y-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Sistema Activo</span>
                        </div>
                        <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight">Finanzas Personales</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-1 font-medium italic">"Toma el control de tu futuro financiero hoy."</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
                            {[
                                { id: 'thisMonth', label: 'Este Mes' },
                                { id: 'last7Days', label: '7 Días' },
                                { id: 'year', label: 'Este Año' },
                                { id: 'all', label: 'Todo' }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleQuickFilter(item.id)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                        quickFilter === item.id
                                            ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                    )}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={downloadReport}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl font-bold text-sm shadow-xl shadow-emerald-600/20 transition-all active:scale-95"
                        >
                            Descargar Reporte
                        </button>
                    </div>
                </div>

                {/* KPIs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {kpiData.map((kpi, idx) => (
                        <KPICard key={idx} {...kpi} delay={idx * 0.1} />
                    ))}
                </div>

                {/* Quick Access Widgets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* MercadoPago Status Widget */}
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

                    {/* Academia Widget */}
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

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2 group" title="Flujo de Caja Mensual" subtitle="Comparativa de ingresos y gastos" delay={0.4}>
                        <div className="h-[300px]">
                            <IncomeExpenseChart data={incomeVsExpensesData} />
                        </div>
                    </Card>
                    <Card className="lg:col-span-1" title="Categorías de Gasto" subtitle="Distribución del mes actual" delay={0.5}>
                        <div className="h-[300px]">
                            <ExpenseBreakdownChart data={expenseCategoriesData} />
                        </div>
                    </Card>
                </div>

                {/* Charts Row 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-1" title="Cumplimiento de Presupuesto" subtitle="Actual vs Planeado" delay={0.6}>
                        <div className="h-[300px]">
                            <BudgetComparisonChart data={budgetComparisonData} />
                        </div>
                    </Card>
                    <Card className="lg:col-span-2" title="Análisis de Ahorro" subtitle="Cómo se distribuye tu dinero (Waterfall)" delay={0.7}>
                        <div className="h-[300px]">
                            <CashFlowWaterfallChart data={waterfallData} />
                        </div>
                    </Card>
                </div>

                {/* Recent Transactions */}
                <Card title="Transacciones Recientes" subtitle="Tu última actividad financiera" delay={0.8}>
                    <div className="overflow-x-auto">
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
                                {recentTransactions.map((tx) => (
                                    <tr key={tx.id} className="bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                                                <ArrowUpRight className="w-4 h-4" />
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
                                            {Number(tx.amount) > 0 ? '+' : ''}{Number(tx.amount).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </Layout>
    );
}
