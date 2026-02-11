const BaseController = require('../../common/BaseController');
const savingsService = require('./SavingsService');

/**
 * Controlador para rutas de metas de ahorro
 */
class SavingsController extends BaseController {
    /**
     * GET /api/savings-goals
     */
    async getAll(req, res, next) {
        try {
            const goals = await savingsService.getAll(req.user.id);
            return this.ok(res, goals);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/savings-goals/:id
     */
    async getById(req, res, next) {
        try {
            const goal = await savingsService.getById(req.params.id, req.user.id);
            return this.ok(res, goal);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/savings-goals
     */
    async create(req, res, next) {
        try {
            const goal = await savingsService.create(req.user.id, req.body);
            return this.created(res, goal);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/savings-goals/:id
     */
    async update(req, res, next) {
        try {
            const goal = await savingsService.update(req.params.id, req.user.id, req.body);
            return this.ok(res, goal);
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/savings-goals/:id
     */
    async delete(req, res, next) {
        try {
            await savingsService.delete(req.params.id, req.user.id);
            return this.noContent(res);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SavingsController();
