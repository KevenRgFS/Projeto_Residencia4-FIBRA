const express = require("express");
const { z } = require("zod");
const pool = require("../db");
const { AppError, asyncRoute } = require("../errors");
const { requireRole } = require("../auth");
const { recordAudit } = require("../audit");

const router = express.Router();
const actionSchema = z.object({
    name: z.string().trim().min(1).max(160),
    category: z.enum(["capacitacao", "consultoria", "evento", "missao", "workshop", "meetup", "programa_aceleracao", "outro"]),
    startDate: z.iso.date(),
    endDate: z.iso.date().nullable().optional(),
    targetAudience: z.string().max(160).nullable().optional(),
    description: z.string().max(5000).nullable().optional(),
}).refine((action) => !action.endDate || action.endDate >= action.startDate, {
    path: ["endDate"], message: "A data final deve ser igual ou posterior à inicial.",
});

router.get("/", asyncRoute(async (req, res) => {
    const result = await pool.query(
        `SELECT a.id, a.name, a.category, a.start_date AS "startDate", a.end_date AS "endDate",
                a.target_audience AS "targetAudience", a.description,
                COUNT(p.id)::int AS "participationCount"
         FROM actions a LEFT JOIN participations p ON p.action_id = a.id
         GROUP BY a.id ORDER BY a.start_date DESC, a.name`
    );
    res.json({ data: result.rows });
}));

router.post("/", requireRole("admin", "gestor", "analista"), asyncRoute(async (req, res) => {
    const action = actionSchema.parse(req.body);
    const result = await pool.query(
        `INSERT INTO actions (name, category, start_date, end_date, target_audience, description, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [action.name, action.category, action.startDate, action.endDate || null, action.targetAudience || null,
            action.description || null, req.user.id]
    );
    await recordAudit(req, "action.create", "action", result.rows[0].id);
    res.status(201).json({ data: result.rows[0] });
}));

router.get("/:id", asyncRoute(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const result = await pool.query("SELECT * FROM actions WHERE id = $1", [id]);
    if (!result.rowCount) throw new AppError(404, "Ação não encontrada.");
    res.json({ data: result.rows[0] });
}));

module.exports = router;