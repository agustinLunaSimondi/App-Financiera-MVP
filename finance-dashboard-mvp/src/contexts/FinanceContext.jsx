import React, { createContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';

// Crear el contexto
export const FinanceContext = createContext();

/**
 * Provider de contexto financiero global
 * Maneja todo el estado de la aplicación: transacciones, presupuestos, cuentas, etc.
 */
export function FinanceProvider({ children }) {
    // Estados
    const [transactions, setTransactions] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [savingsGoals, setSavingsGoals] = useState([]);
    const [recurringTransactions, setRecurringTransactions] = useState([]);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filtros activos
    const [filters, setFilters] = useState({
        startDate: null,
        endDate: null,
        category: null
    });

    // ============= LOAD INITIAL DATA =============

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [txs, bdgs, accs, cats, sets, goals, recs] = await Promise.all([
                api.getTransactions(filters),
                api.getBudgets(),
                api.getAccounts(),
                api.getCategories(),
                api.getSettings(),
                api.getSavingsGoals(),
                api.getRecurring()
            ]);

            setTransactions(txs);
            setBudgets(bdgs);
            setAccounts(accs);
            setCategories(cats);
            setSettings(sets);
            setSavingsGoals(goals);
            setRecurringTransactions(recs);
        } catch (err) {
            setError(err.message);
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Aplicar modo oscuro al cargar settings
    useEffect(() => {
        if (settings.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [settings.darkMode]);

    // ============= TRANSACTIONS =============

    const addTransaction = useCallback(async (transaction) => {
        try {
            const newTx = await api.addTransaction(transaction);
            setTransactions(prev => [...prev, newTx]);
            return newTx;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const updateTransaction = useCallback(async (id, updates) => {
        try {
            const updatedTx = await api.updateTransaction(id, updates);
            setTransactions(prev => prev.map(tx => tx.id === id ? updatedTx : tx));
            return updatedTx;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const deleteTransaction = useCallback(async (id) => {
        try {
            await api.deleteTransaction(id);
            setTransactions(prev => prev.filter(tx => tx.id !== id));
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    // ============= BUDGETS =============

    const addBudget = useCallback(async (budget) => {
        try {
            const newBudget = await api.addBudget(budget);
            setBudgets(prev => [...prev, newBudget]);
            return newBudget;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const updateBudget = useCallback(async (id, updates) => {
        try {
            const updatedBudget = await api.updateBudget(id, updates);
            setBudgets(prev => prev.map(b => b.id === id ? updatedBudget : b));
            return updatedBudget;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const deleteBudget = useCallback(async (id) => {
        try {
            await api.deleteBudget(id);
            setBudgets(prev => prev.filter(b => b.id !== id));
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    // ============= ACCOUNTS =============

    const addAccount = useCallback(async (account) => {
        try {
            const newAccount = await api.addAccount(account);
            setAccounts(prev => [...prev, newAccount]);
            return newAccount;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const updateAccount = useCallback(async (id, updates) => {
        try {
            const updatedAccount = await api.updateAccount(id, updates);
            setAccounts(prev => prev.map(a => a.id === id ? updatedAccount : a));
            return updatedAccount;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const deleteAccount = useCallback(async (id) => {
        try {
            await api.deleteAccount(id);
            setAccounts(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    // ============= SETTINGS =============

    const updateSettings = useCallback(async (updates) => {
        try {
            const newSettings = await api.updateSettings(updates);
            setSettings(newSettings);
            return newSettings;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const deleteUserAccount = useCallback(async () => {
        try {
            await api.deleteUserAccount();
            return true;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    // ============= FILTERS =============

    const updateFilters = useCallback((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters({
            startDate: null,
            endDate: null,
            category: null
        });
    }, []);

    // Valor del contexto
    const value = {
        // Estado
        transactions,
        budgets,
        accounts,
        categories,
        savingsGoals,
        recurringTransactions,
        settings,
        loading,
        error,
        filters,

        // Funciones de transacciones
        addTransaction,
        updateTransaction,
        deleteTransaction,

        // Funciones de presupuestos
        addBudget,
        updateBudget,
        deleteBudget,

        // Funciones de cuentas
        addAccount,
        updateAccount,
        deleteAccount,

        // Funciones de configuración
        updateSettings,
        deleteUserAccount,

        // Funciones de categorías
        addCategory: useCallback(async (category) => {
            try {
                const newCat = await api.addCategory(category);
                setCategories(prev => [...prev, newCat]);
                return newCat;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        updateCategory: useCallback(async (id, updates) => {
            try {
                const updatedCat = await api.updateCategory(id, updates);
                setCategories(prev => prev.map(c => c.id === id ? updatedCat : c));
                return updatedCat;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        deleteCategory: useCallback(async (id) => {
            try {
                await api.deleteCategory(id);
                setCategories(prev => prev.filter(c => c.id !== id));
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        // Funciones de metas de ahorro
        addSavingGoal: useCallback(async (goal) => {
            try {
                const newGoal = await api.addSavingGoal(goal);
                setSavingsGoals(prev => [...prev, newGoal]);
                return newGoal;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        updateSavingGoal: useCallback(async (id, updates) => {
            try {
                const updated = await api.updateSavingGoal(id, updates);
                setSavingsGoals(prev => prev.map(g => g.id === id ? updated : g));
                // Si hubo un cambio en currentAmount (depósito), recargar cuentas para ver balance actualizado
                if (updates.currentAmount !== undefined) {
                    const accs = await api.getAccounts();
                    setAccounts(accs);
                }
                return updated;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        deleteSavingGoal: useCallback(async (id) => {
            try {
                await api.deleteSavingGoal(id);
                setSavingsGoals(prev => prev.filter(g => g.id !== id));
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        // Funciones de transacciones recurrentes
        addRecurring: useCallback(async (rt) => {
            try {
                const newRT = await api.addRecurring(rt);
                setRecurringTransactions(prev => [...prev, newRT]);
                return newRT;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        updateRecurring: useCallback(async (id, updates) => {
            try {
                const updated = await api.updateRecurring(id, updates);
                setRecurringTransactions(prev => prev.map(rt => rt.id === id ? updated : rt));
                return updated;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        deleteRecurring: useCallback(async (id) => {
            try {
                await api.deleteRecurring(id);
                setRecurringTransactions(prev => prev.filter(rt => rt.id !== id));
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        // Funciones de filtros
        updateFilters,
        clearFilters,

        // Reload data
        refreshData: loadData
    };

    return (
        <FinanceContext.Provider value={value}>
            {children}
        </FinanceContext.Provider>
    );
}
