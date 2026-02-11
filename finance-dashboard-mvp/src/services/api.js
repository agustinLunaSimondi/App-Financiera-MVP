import client from './client';

/**
 * API Service Layer - Conectado al Backend Real
 */

// ============= TRANSACTIONS =============

export const getTransactions = async (filters = {}) => {
    const params = {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.category) params.categoryId = filters.category;

    const response = await client.get('/transactions', { params });
    // Parse amounts ensuring they are numbers and flatten relations
    return response.data.transactions.map(tx => ({
        ...tx,
        amount: Number(tx.amount),
        category: tx.category?.name || tx.category || 'Sin categoría',
        account: tx.account?.name || tx.account || 'Desconocida',
        categoryId: tx.categoryId,
        accountId: tx.accountId
    }));
};

export const getTransactionById = async (id) => {
    const response = await client.get(`/transactions/${id}`);
    const tx = response.data;
    return {
        ...tx,
        amount: Number(tx.amount),
        category: tx.category?.name || tx.category,
        account: tx.account?.name || tx.account
    };
};

export const addTransaction = async (transaction) => {
    const payload = {
        ...transaction,
        amount: parseFloat(transaction.amount)
    };
    const response = await client.post('/transactions', payload);
    const tx = response.data;
    return {
        ...tx,
        amount: Number(tx.amount),
        category: tx.category?.name || tx.category,
        account: tx.account?.name || tx.account
    };
};

export const updateTransaction = async (id, updates) => {
    const response = await client.put(`/transactions/${id}`, updates);
    const tx = response.data;
    return {
        ...tx,
        amount: Number(tx.amount),
        category: tx.category?.name || tx.category,
        account: tx.account?.name || tx.account
    };
};

export const deleteTransaction = async (id) => {
    await client.delete(`/transactions/${id}`);
    return true;
};

// ============= BUDGETS =============

export const getBudgets = async () => {
    try {
        const response = await client.get('/budgets');
        return response.data.map(b => ({
            ...b,
            amount: Number(b.amount)
        }));
    } catch (e) {
        console.warn('Budgets endpoint not ready', e);
        return [];
    }
};

export const addBudget = async (budget) => {
    const response = await client.post('/budgets', budget);
    return {
        ...response.data,
        amount: Number(response.data.amount)
    };
};

export const updateBudget = async (id, updates) => {
    const response = await client.put(`/budgets/${id}`, updates);
    return {
        ...response.data,
        amount: Number(response.data.amount)
    };
};

export const deleteBudget = async (id) => {
    await client.delete(`/budgets/${id}`);
    return true;
};

// ============= ACCOUNTS =============

export const getAccounts = async () => {
    try {
        const response = await client.get('/accounts');
        return response.data.map(acc => ({
            ...acc,
            balance: Number(acc.balance)
        }));
    } catch (e) {
        return [];
    }
};

export const addAccount = async (account) => {
    const response = await client.post('/accounts', account);
    return {
        ...response.data,
        balance: Number(response.data.balance)
    };
};

export const updateAccount = async (id, updates) => {
    const response = await client.put(`/accounts/${id}`, updates);
    return {
        ...response.data,
        balance: Number(response.data.balance)
    };
};

export const deleteAccount = async (id) => {
    await client.delete(`/accounts/${id}`);
    return true;
};

// ============= CATEGORIES =============

export const getCategories = async () => {
    const response = await client.get('/categories');
    return response.data;
};

export const addCategory = async (category) => {
    const response = await client.post('/categories', category);
    return response.data;
};

export const updateCategory = async (id, updates) => {
    const response = await client.put(`/categories/${id}`, updates);
    return response.data;
};

export const deleteCategory = async (id) => {
    await client.delete(`/categories/${id}`);
    return true;
};

// ============= SETTINGS =============

export const getSettings = async () => {
    const response = await client.get('/auth/me'); // Usamos perfil de usuario como settings
    return {
        currency: response.data.currency || 'USD',
        darkMode: response.data.darkMode
    };
};

export const updateSettings = async (updates) => {
    const response = await client.put('/auth/me', updates);
    return {
        currency: response.data.currency,
        darkMode: response.data.darkMode
    };
};
// ============= SAVINGS GOALS =============

export const getSavingsGoals = async () => {
    const response = await client.get('/savings-goals');
    return response.data.map(goal => ({
        ...goal,
        targetAmount: Number(goal.targetAmount),
        currentAmount: Number(goal.currentAmount)
    }));
};

export const addSavingGoal = async (goal) => {
    const response = await client.post('/savings-goals', goal);
    return {
        ...response.data,
        targetAmount: Number(response.data.targetAmount),
        currentAmount: Number(response.data.currentAmount)
    };
};

export const updateSavingGoal = async (id, updates) => {
    const response = await client.put(`/savings-goals/${id}`, updates);
    return {
        ...response.data,
        targetAmount: Number(response.data.targetAmount),
        currentAmount: Number(response.data.currentAmount)
    };
};

export const deleteSavingGoal = async (id) => {
    await client.delete(`/savings-goals/${id}`);
    return true;
};
// ============= RECURRING TRANSACTIONS =============

export const getRecurring = async () => {
    const response = await client.get('/recurring');
    return response.data.map(rt => ({
        ...rt,
        amount: Number(rt.amount),
        category: rt.category?.name || rt.category,
        account: rt.account?.name || rt.account
    }));
};

export const addRecurring = async (rt) => {
    const response = await client.post('/recurring', rt);
    return {
        ...response.data,
        amount: Number(response.data.amount)
    };
};

export const updateRecurring = async (id, updates) => {
    const response = await client.put(`/recurring/${id}`, updates);
    return {
        ...response.data,
        amount: Number(response.data.amount)
    };
};

export const deleteRecurring = async (id) => {
    await client.delete(`/recurring/${id}`);
    return true;
};
