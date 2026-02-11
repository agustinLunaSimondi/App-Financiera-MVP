const express = require('express');
const savingsController = require('./SavingsController');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

router.get('/', (req, res, next) => savingsController.getAll(req, res, next));
router.get('/:id', (req, res, next) => savingsController.getById(req, res, next));
router.post('/', (req, res, next) => savingsController.create(req, res, next));
router.put('/:id', (req, res, next) => savingsController.update(req, res, next));
router.delete('/:id', (req, res, next) => savingsController.delete(req, res, next));

module.exports = router;
