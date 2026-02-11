/**
 * Clase base para todos los controladores
 * Proporciona métodos estándar para enviar respuestas
 */
class BaseController {
    /**
     * Enviar respuesta de éxito (200 OK)
     */
    ok(res, data) {
        return res.status(200).json(data);
    }

    /**
     * Enviar respuesta de creación exitosa (201 Created)
     */
    created(res, data) {
        return res.status(201).json(data);
    }

    /**
     * Enviar respuesta sin contenido (204 No Content)
     */
    noContent(res) {
        return res.status(204).send();
    }

    /**
     * Enviar error de validación o cliente (400 Bad Request)
     */
    clientError(res, message = 'Solicitud incorrecta') {
        return res.status(400).json({ error: message });
    }

    /**
     * Enviar error de no autorizado (401 Unauthorized)
     */
    unauthorized(res, message = 'No autorizado') {
        return res.status(401).json({ error: message });
    }

    /**
     * Enviar error de prohibido (403 Forbidden)
     */
    forbidden(res, message = 'Prohibido') {
        return res.status(403).json({ error: message });
    }

    /**
     * Enviar error de no encontrado (404 Not Found)
     */
    notFound(res, message = 'Recurso no encontrado') {
        return res.status(404).json({ error: message });
    }

    /**
     * Enviar error interno del servidor (500 Internal Server Error)
     */
    fail(res, error) {
        console.error(error);
        return res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
    noContent(res) {
        return res.status(204).send();
    }

    notFound(res, message = 'Recurso no encontrado') {
        return res.status(404).json({ error: 'Not Found', message });
    }

    badRequest(res, message = 'Solicitud inválida') {
        return res.status(400).json({ error: 'Bad Request', message });
    }
}

module.exports = BaseController;
