/**
 * Middleware global para manejo de errores
 * Captura excepciones y envía respuestas estandarizadas
 */
const errorHandler = (err, req, res, next) => {
    console.error(`[Error] ${req.method} ${req.path} >>`, err);

    // Errores específicos de Prisma (opcional, para ser más descriptivos)
    if (err.code === 'P2002') {
        return res.status(400).json({
            error: 'Conflicto de unicidad',
            message: `Ya existe un registro con ese ${err.meta?.target}`
        });
    }

    if (err.code === 'P2025') {
        return res.status(404).json({
            error: 'No encontrado',
            message: 'El registro solicitado no existe'
        });
    }

    // Error por defecto
    const statusCode = err.status || 500;
    const message = err.message || 'Error interno del servidor';

    res.status(statusCode).json({
        error: statusCode === 500 ? 'Error interno' : 'Error de cliente',
        message
    });
};

module.exports = errorHandler;
