const BaseController = require('../../common/BaseController');
const budgetService = require('./BudgetService');

/**
 * Controlador para rutas de presupuestos
 */
class BudgetController extends BaseController {
    /**
     * GET /api/budgets
     */
    async getAll(req, res, next) {
        try {
            const budgets = await budgetService.getAll(req.user.id);
            return this.ok(res, budgets);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/budgets/:id
     */
    async getById(req, res, next) {
        try {
            const budget = await budgetService.getById(req.params.id, req.user.id);
            return this.ok(res, budget);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/budgets
     */
    async create(req, res, next) {
        try {
            const budget = await budgetService.create(req.user.id, req.body);
            return this.created(res, budget);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/budgets/:id
     */
    async update(req, res, next) {
        try {
            const budget = await budgetService.update(req.params.id, req.user.id, req.body);
            return this.ok(res, budget);
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/budgets/:id
     */
    async delete(req, res, next) {
        try {
            await budgetService.delete(req.params.id, req.user.id);
            return this.noContent(res);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new BudgetController();
