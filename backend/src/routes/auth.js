const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const pool = require("../db");
const { AppError, asyncRoute } = require("../errors");

const router = express.Router();
const loginSchema = z.object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(200),
});

router.post("/login", asyncRoute(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    if (!process.env.JWT_SECRET) throw new AppError(500, "JWT_SECRET não configurado.");

    const result = await pool.query(
        `SELECT id, name, email, password_hash, role, status, company_id
         FROM users WHERE lower(email) = lower($1)`,
        [email]
    );
    const user = result.rows[0];
    if (!user || user.status !== "ativo" || !(await bcrypt.compare(password, user.password_hash))) {
        throw new AppError(401, "E-mail ou senha inválidos.");
    }

    await pool.query("UPDATE users SET last_access_at = NOW() WHERE id = $1", [user.id]);
    const token = jwt.sign(
        { id: user.id, role: user.role, name: user.name, companyId: user.company_id },
        process.env.JWT_SECRET,
        { expiresIn: "8h", issuer: "fibra-api", audience: "fibra-platform" }
    );
    res.json({ token, tokenType: "Bearer", expiresIn: 28800, user: { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.company_id } });
}));

module.exports = router;