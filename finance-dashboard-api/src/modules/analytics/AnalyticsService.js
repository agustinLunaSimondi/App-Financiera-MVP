const prisma = require('../../config/database');

/**
 * Servicio para manejar cálculos analíticos y reportes
 */
class AnalyticsService {
    /**
     * Obtener KPIs principales del Dashboard
     */
    async getKPIs(userId, filters = {}) {
        const { startDate, endDate } = filters;

        const dateFilter = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);

        // 1. Balance Total (Todas las cuentas del usuario)
        const accounts = await prisma.account.findMany({
            where: { userId }
        });
        const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

        // 2. Ingresos del periodo
        const income = await prisma.transaction.aggregate({
            where: {
                account: { userId },
                amount: { gt: 0 },
                ...(Object.keys(dateFilter).length > 0 && { transactionDate: dateFilter })
            },
            _sum: { amount: true }
        });

        // 3. Gastos del periodo
        const expenses = await prisma.transaction.aggregate({
            where: {
                account: { userId },
                amount: { lt: 0 },
                ...(Object.keys(dateFilter).length > 0 && { transactionDate: dateFilter })
            },
            _sum: { amount: true }
        });

        // 4. Ahorro neto
        const netSavings = (Number(income._sum.amount) || 0) + (Number(expenses._sum.amount) || 0);

        return {
            totalBalance,
            periodIncome: Number(income._sum.amount) || 0,
            periodExpenses: Math.abs(Number(expenses._sum.amount) || 0),
            netSavings
        };
    }

    /**
     * Obtener distribución de gastos por categoría
     */
    async getExpenseBreakdown(userId, filters = {}) {
        const { startDate, endDate } = filters;

        const transactions = await prisma.transaction.findMany({
            where: {
                account: { userId },
                amount: { lt: 0 },
                ...(startDate || endDate ? {
                    transactionDate: {
                        ...(startDate && { gte: new Date(startDate) }),
                        ...(endDate && { lte: new Date(endDate) })
                    }
                } : {})
            },
            include: {
                category: { select: { name: true, color: true } }
            }
        });

        const breakdown = {};
        transactions.forEach(tx => {
            const categoryName = tx.category.name;
            if (!breakdown[categoryName]) {
                breakdown[categoryName] = {
                    name: categoryName,
                    value: 0,
                    color: tx.category.color
                };
            }
            breakdown[categoryName].value += Math.abs(Number(tx.amount));
        });

        return Object.values(breakdown).sort((a, b) => b.value - a.value);
    }

    /**
     * Obtener flujo de caja mensual (Ingresos vs Gastos)
     */
    async getCashFlow(userId, months = 6) {
        const transactions = await prisma.transaction.findMany({
            where: {
                account: { userId }
            },
            orderBy: { transactionDate: 'asc' }
        });

        const flow = {};
        transactions.forEach(tx => {
            const date = new Date(tx.transactionDate);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!flow[monthKey]) {
                flow[monthKey] = {
                    month: monthKey,
                    income: 0,
                    expenses: 0
                };
            }

            const amount = Number(tx.amount);
            if (amount > 0) {
                flow[monthKey].income += amount;
            } else {
                flow[monthKey].expenses += Math.abs(amount);
            }
        });

        return Object.values(flow).slice(-months);
    }
}

module.exports = new AnalyticsService();
