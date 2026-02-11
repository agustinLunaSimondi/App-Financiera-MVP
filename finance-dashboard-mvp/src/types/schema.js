// Esquemas de datos para el dashboard financiero

/**
 * @typedef {Object} Transaction
 * @property {number} id - ID único de la transacción
 * @property {string} name - Nombre/descripción de la transacción
 * @property {number} amount - Monto (positivo para ingresos, negativo para gastos)
 * @property {string} category - Categoría de la transacción
 * @property {string} date - Fecha en formato ISO string
 * @property {string} type - Tipo: 'income' o 'expense'
 * @property {number} accountId - ID de la cuenta asociada
 */

/**
 * @typedef {Object} Budget
 * @property {number} id - ID único del presupuesto
 * @property {string} category - Categoría presupuestada
 * @property {number} amount - Monto del presupuesto
 * @property {string} period - Período: 'monthly', 'yearly'
 */

/**
 * @typedef {Object} Account
 * @property {number} id - ID único de la cuenta
 * @property {string} name - Nombre de la cuenta
 * @property {string} type - Tipo: 'checking', 'savings', 'credit'
 * @property {number} balance - Saldo actual
 * @property {string} currency - Código de moneda (ej: 'USD', 'ARS')
 */

/**
 * @typedef {Object} Category
 * @property {string} id - ID único de la categoría
 * @property {string} name - Nombre de la categoría
 * @property {string} color - Color en formato hex
 * @property {string} icon - Nombre del icono
 * @property {string} type - Tipo: 'income' o 'expense'
 */

export const CATEGORY_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense'
};

export const ACCOUNT_TYPES = {
  CHECKING: 'checking',
  SAVINGS: 'savings',
  CREDIT: 'credit'
};

export const BUDGET_PERIODS = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly'
};
