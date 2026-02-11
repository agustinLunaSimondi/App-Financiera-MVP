const BaseController = require('../../common/BaseController');
const recurringService = require('./RecurringService');

/**
 * Controlador para rutas de transacciones recurrentes
 */
class RecurringController extends BaseController {
    /**
     * GET /api/recurring
     */
    async getAll(req, res, next) {
        try {
            const results = await recurringService.getAll(req.user.id);
            return this.ok(res, results);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/recurring/:id
     */
    async getById(req, res, next) {
        try {
            const rt = await recurringService.getById(req.params.id, req.user.id);
            return this.ok(res, rt);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/recurring
     */
    async create(req, res, next) {
        try {
            const rt = await recurringService.create(req.user.id, req.body);
            return this.created(res, rt);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/recurring/:id
     */
    async update(req, res, next) {
        try {
            const rt = await recurringService.update(req.params.id, req.user.id, req.body);
            return this.ok(res, rt);
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/recurring/:id
     */
    async delete(req, res, next) {
        try {
            await recurringService.delete(req.params.id, req.user.id);
            return this.noContent(res);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new RecurringController();
