const express = require("express");
const { z } = require("zod");
const pool = require("../db");
const { AppError, asyncRoute } = require("../errors");
const { requireRole } = require("../auth");
const { getEngagement } = require("../engagement");
const { recordAudit } = require("../audit");

const router = express.Router();

router.get("/:empresaId", asyncRoute(async (req, res) => {
    const empresaId = z.coerce.number().int().positive().parse(req.params.empresaId);
    if (req.user.role === "empresa" && Number(req.user.companyId) !== empresaId) {
        throw new AppError(403, "Você só pode consultar o engajamento da sua organização.");
    }
    const result = await getEngagement(empresaId);
    if (!result) throw new AppError(404, "Empresa não encontrada.");
    res.json({ data: result });
}));

router.patch("/empresas/:empresaId/override", requireRole("admin", "gestor"), asyncRoute(async (req, res) => {
    const empresaId = z.coerce.number().int().positive().parse(req.params.empresaId);
    const input = z.object({ score: z.coerce.number().min(0).max(10), reason: z.string().trim().min(3).max(500) }).parse(req.body);
    const exists = await pool.query("SELECT 1 FROM companies WHERE id = $1", [empresaId]);
    if (!exists.rowCount) throw new AppError(404, "Empresa não encontrada.");
    const riskLevel = input.score < 3.5 ? "alto" : input.score < 7 ? "medio" : "baixo";
    const saved = await pool.query(
        `INSERT INTO engagement_scores (company_id, score, risk_level, suggested_action, is_overridden, override_reason)
         VALUES ($1, $2, $3, 'Score revisado manualmente pelo gestor.', TRUE, $4)
         RETURNING score, risk_level, suggested_action, is_overridden, override_reason, calculated_at`,
        [empresaId, input.score, riskLevel, input.reason]
    );
    await recordAudit(req, "engagement.override", "company", empresaId, { score: input.score, reason: input.reason });
    res.json({ data: { ...saved.rows[0], companyId: empresaId, manuallyOverridden: true } });
}));

router.delete("/empresas/:empresaId/override", requireRole("admin", "gestor"), asyncRoute(async (req, res) => {
    const empresaId = z.coerce.number().int().positive().parse(req.params.empresaId);
    const latest = await pool.query("SELECT is_overridden FROM engagement_scores WHERE company_id = $1 ORDER BY calculated_at DESC LIMIT 1", [empresaId]);
    if (!latest.rowCount) throw new AppError(404, "Score de engajamento não encontrado.");
    if (latest.rows[0].is_overridden) {
        await pool.query("UPDATE engagement_scores SET is_overridden = FALSE WHERE id = (SELECT id FROM engagement_scores WHERE company_id = $1 ORDER BY calculated_at DESC LIMIT 1)", [empresaId]);
    }
    await recordAudit(req, "engagement.override.clear", "company", empresaId);
    res.status(204).end();
}));

module.exports = router;