const jwt = require("jsonwebtoken");
const { AppError } = require("./errors");

function requireAuth(req, res, next) {
    const token = req.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return next(new AppError(401, "Autenticação necessária."));
    if (!process.env.JWT_SECRET) return next(new AppError(500, "JWT_SECRET não configurado."));

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET, {
            issuer: "fibra-api",
            audience: "fibra-platform",
        });
        return next();
    } catch {
        return next(new AppError(401, "Token inválido ou expirado."));
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new AppError(403, "Você não tem permissão para esta operação."));
        }
        return next();
    };
}

module.exports = { requireAuth, requireRole };