class AppError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function asyncRoute(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function errorHandler(error, req, res, next) {
    if (res.headersSent) return next(error);

    if (error.name === "ZodError") {
        return res.status(400).json({
            error: "Dados inválidos.",
            details: error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
        });
    }

    if (error.code === "23505") {
        return res.status(409).json({ error: "Já existe um registro com esses dados." });
    }
    if (error.code === "23503") {
        return res.status(400).json({ error: "Um dos registros relacionados não existe." });
    }
    if (error.code === "23514" || error.code === "22P02") {
        return res.status(400).json({ error: "Um ou mais valores não são válidos." });
    }

    const status = error.status || 500;
    if (status >= 500) console.error(error);
    return res.status(status).json({
        error: status >= 500 ? "Erro interno do servidor." : error.message,
    });
}

module.exports = { AppError, asyncRoute, errorHandler };