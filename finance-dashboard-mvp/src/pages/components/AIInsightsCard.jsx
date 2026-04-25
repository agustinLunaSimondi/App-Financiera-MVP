import React, { useEffect, useState } from 'react';
import { Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';
import { useFinance } from '../../../hooks/useFinance';
import { useLanguage } from '../../../contexts/LanguageContext';
import { formatCurrency } from '../../../utils/formatters';

export function AIInsightsCard() {
    const { t } = useLanguage();
    const { transactions, accounts, budgets } = useFinance();
    const [insights, setInsights] = useState([]);

    useEffect(() => {
        // Here we build heuristic insights locally to save a request, since the data is all here.
        // Or if we implemented the python endpoint we would fetch it.
        // For the sake of MVP completeness without external API, let's implement the heuristic rule engine here locally,
        // which avoids latency and works perfectly with the Context data.
        
        if (!transactions.length) return;

        const date = new Date();
        const currentMonthMatches = (dateStr) => {
            const d = new Date(dateStr + 'T00:00:00');
            return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
        };

        const currentMonthTxs = transactions.filter(t => currentMonthMatches(t.date || t.transactionDate));
        const expenses = currentMonthTxs.filter(t => Number(t.amount) < 0);
        const totalExpense = expenses.reduce((a, b) => a + Math.abs(Number(b.amount)), 0);
        const income = currentMonthTxs.filter(t => Number(t.amount) > 0);
        const totalIncome = income.reduce((a, b) => a + Number(b.amount), 0);

        let newInsights = [];

        // Insight 1: Savings Capacity
        if (totalIncome > 0) {
            const expenseRatio = totalExpense / totalIncome;
            if (expenseRatio > 0.8) {
                newInsights.push({
                    type: 'warning',
                    icon: AlertTriangle,
                    title: 'Alto nivel de gastos',
                    text: `Has gastado el ${(expenseRatio * 100).toFixed(0)}% de tus ingresos este mes. Intenta reducir gastos prescindibles para alcanzar tu regla 50/30/20.`
                });
            } else if (expenseRatio < 0.6) {
                const potentialSavings = totalIncome * 0.2;
                newInsights.push({
                    type: 'success',
                    icon: TrendingUp,
                    title: '¡Excelente capacidad de ahorro!',
                    text: `Tus gastos están muy controlados. Podrías destinar ${formatCurrency(potentialSavings)} extra este mes a un plazo fijo o CEDEARs.`
                });
            }
        }

        // Insight 2: Category warning
        const categoryMap = {};
        expenses.forEach(e => {
            const cat = e.categoryId || 'Otros';
            categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(Number(e.amount));
        });
        
        const sortedCats = Object.entries(categoryMap).sort((a,b) => b[1] - a[1]);
        if (sortedCats.length > 0 && totalExpense > 0) {
            const topCat = sortedCats[0];
            const catRatio = topCat[1] / totalExpense;
            // Get category name
            if (catRatio > 0.4) {
                newInsights.push({
                    type: 'info',
                    icon: Lightbulb,
                    title: 'Oportunidad de optimización',
                    text: `El ${(catRatio * 100).toFixed(0)}% de tus gastos mensuales se concentran en una sola categoría. Revisa si puedes ajustar este presupuesto.`
                });
            }
        }

        // Insight 3: Balance warning
        const totalBalance = accounts.reduce((a, b) => a + Number(b.balance), 0);
        if (totalBalance > 0 && totalBalance > totalExpense * 3 && accounts.some(a => a.type === 'cash' || a.type === 'checking')) {
            newInsights.push({
                type: 'info',
                icon: Lightbulb,
                title: 'Dinero ocioso detectado',
                text: 'Tienes una cantidad considerable en líquido. Considera invertir parte de tu saldo en Fondos Comunes o Plazos Fijos para ganarle a la inflación.'
            });
        }

        setInsights(newInsights);
    }, [transactions, accounts, budgets]);

    if (!insights.length) return null;

    return (
        <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-purple-200/50 dark:border-purple-500/20 rounded-2xl p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white mb-4">
                <span className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                    <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </span>
                {t('insights.title')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {insights.map((insight, i) => (
                    <div key={i} className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm rounded-xl p-4 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
                        <div className="flex items-start gap-3">
                            <insight.icon className={`w-5 h-5 mt-0.5 ${
                                insight.type === 'warning' ? 'text-amber-500' :
                                insight.type === 'success' ? 'text-emerald-500' : 'text-blue-500'
                            }`} />
                            <div>
                                <h3 className="font-bold text-zinc-900 dark:text-white text-sm mb-1">{insight.title}</h3>
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{insight.text}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
