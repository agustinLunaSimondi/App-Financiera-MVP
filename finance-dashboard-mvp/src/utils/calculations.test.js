import { describe, it, expect } from 'vitest';
import {
    calculateTotalIncome,
    calculateTotalExpenses,
    calculateNetSavings,
    calculateTotalBalance,
    groupTransactionsByCategory,
    calculateBudgetUsage,
    isBudgetExceeded,
    calculatePercentageChange,
} from './calculations';

describe('calculations', () => {
    const sample = [
        { amount: 5000, category: 'Sueldo' },
        { amount: -1000, category: 'Comida' },
        { amount: -500, category: 'Comida' },
        { amount: 200, category: 'Freelance' },
        { amount: -300, category: 'Transporte' },
    ];

    it('suma ingresos correctamente', () => {
        expect(calculateTotalIncome(sample)).toBe(5200);
    });

    it('suma gastos en valor absoluto', () => {
        expect(calculateTotalExpenses(sample)).toBe(1800);
    });

    it('netSavings = ingresos − gastos', () => {
        expect(calculateNetSavings(sample)).toBe(3400);
    });

    it('totalBalance suma todas las cuentas', () => {
        const accounts = [{ balance: 100 }, { balance: 250.5 }, { balance: '-50.25' }];
        expect(calculateTotalBalance(accounts)).toBeCloseTo(300.25, 2);
    });

    it('groupTransactionsByCategory agrupa y suma en absoluto', () => {
        const grouped = groupTransactionsByCategory(sample);
        const food = grouped.find(g => g.category === 'Comida');
        expect(food.total).toBe(1500);
        expect(food.count).toBe(2);
    });

    it('budget usage y exceeded', () => {
        expect(calculateBudgetUsage(50, 100)).toBe(50);
        expect(calculateBudgetUsage(10, 0)).toBe(0);
        expect(isBudgetExceeded(120, 100)).toBe(true);
        expect(isBudgetExceeded(80, 100)).toBe(false);
    });

    it('percentage change', () => {
        expect(calculatePercentageChange(120, 100)).toBe(20);
        expect(calculatePercentageChange(50, 0)).toBe(0);
    });
});
