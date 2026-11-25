const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const pool = require("../db");
const { AppError, asyncRoute } = require("../errors");
const { recordAudit } = require("../audit");

const router = express.Router();
const roles = ["admin", "gestor", "analista", "empresa", "visitante"];
const userSchema = z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(254),
    password: z.string().min(12).max(200),
    role: z.enum(roles),
    companyId: z.coerce.number().int().positive().optional(),
}).strict().superRefine((user, context) => {
    if (user.role === "empresa" && !user.companyId) {
        context.addIssue({ code: "custom", path: ["companyId"], message: "Vincule uma organização ao perfil empresa." });
    }
    if (user.role !== "empresa" && user.companyId) {
        context.addIssue({ code: "custom", path: ["companyId"], message: "A organização só pode ser informada no perfil empresa." });
    }
});

router.get("/", asyncRoute(async (req, res) => {
    const result = await pool.query(
        `SELECT id, name, email, role, status, company_id AS "companyId", created_at AS "createdAt"
         FROM users ORDER BY created_at DESC, id DESC`
    );
    res.json({ data: result.rows });
}));

router.post("/", asyncRoute(async (req, res) => {
    const user = userSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(user.password, 12);
    const result = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, status, company_id)
         VALUES ($1, lower($2), $3, $4, 'pendente', $5)
         RETURNING id, name, email, role, status, company_id AS "companyId", created_at AS "createdAt"`,
        [user.name, user.email, passwordHash, user.role, user.companyId || null]
    );
    await recordAudit(req, "user.create", "user", result.rows[0].id, { role: user.role });
    res.status(201).json({ data: result.rows[0] });
}));

router.post("/:id/autorizar", asyncRoute(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const result = await pool.query(
        `UPDATE users SET status = 'ativo' WHERE id = $1 AND status = 'pendente'
         RETURNING id, name, email, role, status, company_id AS "companyId", created_at AS "createdAt"`,
        [id]
    );
    if (!result.rowCount) {
        const found = await pool.query("SELECT status FROM users WHERE id = $1", [id]);
        if (!found.rowCount) throw new AppError(404, "Usuário não encontrado.");
        throw new AppError(409, "Somente usuários pendentes podem ser autorizados.");
    }
    await recordAudit(req, "user.authorize", "user", id);
    res.json({ data: result.rows[0] });
}));

router.post("/:id/revogar", asyncRoute(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    if (Number(req.user.id) === id) throw new AppError(400, "Você não pode revogar o próprio acesso.");

    const target = await pool.query("SELECT role, status FROM users WHERE id = $1", [id]);
    if (!target.rowCount) throw new AppError(404, "Usuário não encontrado.");
    if (target.rows[0].status !== "ativo") throw new AppError(409, "Somente usuários ativos podem ter o acesso revogado.");

    if (target.rows[0].role === "admin") {
        const admins = await pool.query("SELECT COUNT(*)::int AS total FROM users WHERE role = 'admin' AND status = 'ativo'");
        if (admins.rows[0].total <= 1) throw new AppError(409, "Não é possível revogar o único administrador ativo.");
    }

    const result = await pool.query(
        `UPDATE users SET status = 'inativo'
         WHERE id = $1
         RETURNING id, name, email, role, status, company_id AS "companyId", created_at AS "createdAt"`,
        [id]
    );
    await recordAudit(req, "user.revoke", "user", id);
    res.json({ data: result.rows[0] });
}));

module.exports = router;
