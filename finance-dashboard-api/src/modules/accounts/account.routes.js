const express = require('express');
const accountController = require('./AccountController');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

router.get('/', (req, res, next) => accountController.getAll(req, res, next));
router.get('/:id', (req, res, next) => accountController.getById(req, res, next));
router.post('/', (req, res, next) => accountController.create(req, res, next));
router.put('/:id', (req, res, next) => accountController.update(req, res, next));
router.delete('/:id', (req, res, next) => accountController.delete(req, res, next));

module.exports = router;
