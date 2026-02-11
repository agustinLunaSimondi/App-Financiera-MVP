/**
 * Funciones helper para interactuar con localStorage
 */

const STORAGE_KEYS = {
    TRANSACTIONS: 'finance_transactions',
    BUDGETS: 'finance_budgets',
    ACCOUNTS: 'finance_accounts',
    CATEGORIES: 'finance_categories',
    SETTINGS: 'finance_settings',
    INITIALIZED: 'finance_initialized'
};

/**
 * Guarda datos en localStorage
 */
export const saveToStorage = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
    }
};

/**
 * Lee datos de localStorage
 */
export const loadFromStorage = (key, defaultValue = null) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        return defaultValue;
    }
};

/**
 * Elimina datos de localStorage
 */
export const removeFromStorage = (key) => {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error removing from localStorage:', error);
        return false;
    }
};

/**
 * Limpia todos los datos de la aplicación
 */
export const clearAllStorage = () => {
    try {
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        return true;
    } catch (error) {
        console.error('Error clearing localStorage:', error);
        return false;
    }
};

/**
 * Verifica si la app ya fue inicializada
 */
export const isInitialized = () => {
    return loadFromStorage(STORAGE_KEYS.INITIALIZED, false);
};

/**
 * Marca la app como inicializada
 */
export const markAsInitialized = () => {
    return saveToStorage(STORAGE_KEYS.INITIALIZED, true);
};

export { STORAGE_KEYS };
