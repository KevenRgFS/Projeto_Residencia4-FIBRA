const express = require("express");
const { z } = require("zod");
const pool = require("../db");
const { AppError, asyncRoute } = require("../errors");
const { requireRole } = require("../auth");
const { recordAudit } = require("../audit");

const router = express.Router();
const participationSchema = z.object({
    empresaId: z.coerce.number().int().positive(),
    acaoId: z.coerce.number().int().positive(),
    contatoId: z.coerce.number().int().positive().nullable().optional(),
    dataParticipacao: z.iso.date(),
    status: z.enum(["inscrito", "presente", "concluiu", "cancelou"]).default("presente"),
    horasDedicadas: z.coerce.number().min(0).max(1000).default(0),
    satisfacao: z.coerce.number().int().min(1).max(5).nullable().optional(),
    impactoPercebido: z.coerce.number().int().min(1).max(5).nullable().optional(),
});

async function insertParticipation(client, participation, userId) {
    if (participation.contatoId) {
        const contact = await client.query(
            "SELECT 1 FROM company_contacts WHERE id = $1 AND company_id = $2",
            [participation.contatoId, participation.empresaId]
        );
        if (!contact.rowCount) throw new AppError(400, "O contato informado não pertence à empresa selecionada.");
    }
    const result = await client.query(
        `INSERT INTO participations
            (company_id, action_id, contact_id, participation_date, status, hours_dedicated, satisfaction, perceived_impact, recorded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [participation.empresaId, participation.acaoId, participation.contatoId || null,
            participation.dataParticipacao, participation.status, participation.horasDedicadas,
            participation.satisfacao ?? null, participation.impactoPercebido ?? null, userId]
    );
    return result.rows[0];
}

router.get("/", asyncRoute(async (req, res) => {
    const filters = z.object({
        empresaId: z.coerce.number().int().positive().optional(),
        acaoId: z.coerce.number().int().positive().optional(),
        inicio: z.iso.date().optional(), fim: z.iso.date().optional(),
        status: z.enum(["inscrito", "presente", "concluiu", "cancelou"]).optional(),
    }).parse(req.query);
    const conditions = [];
    const values = [];
    for (const [key, column, operator = "="] of [["empresaId", "p.company_id"], ["acaoId", "p.action_id"], ["inicio", "p.participation_date", ">="], ["fim", "p.participation_date", "<="], ["status", "p.status"]]) {
        if (filters[key] !== undefined) {
            values.push(filters[key]);
            conditions.push(`${column} ${operator} $${values.length}`);
        }
    }
    if (req.user.role === "empresa") {
        if (!req.user.companyId) throw new AppError(403, "Este usuário não está vinculado a uma organização.");
        values.push(req.user.companyId);
        conditions.push(`p.company_id = $${values.length}`);
    }
    const result = await pool.query(
        `SELECT p.id, p.company_id AS "empresaId", c.name AS "empresaNome", p.action_id AS "acaoId",
                a.name AS "acaoNome", a.category AS "tipoAcao", p.participation_date AS "dataParticipacao",
                p.status, p.hours_dedicated AS "horasDedicadas", p.satisfaction AS satisfacao,
                p.perceived_impact AS "impactoPercebido"
         FROM participations p JOIN companies c ON c.id = p.company_id JOIN actions a ON a.id = p.action_id
         ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
         ORDER BY p.participation_date DESC, p.id DESC LIMIT 500`, values
    );
    res.json({ data: result.rows });
}));

router.post("/", requireRole("admin", "gestor", "analista"), asyncRoute(async (req, res) => {
    const participation = participationSchema.parse(req.body);
    const result = await insertParticipation(pool, participation, req.user.id);
    await recordAudit(req, "participation.create", "participation", result.id);
    res.status(201).json({ data: result });
}));

router.post("/lote", requireRole("admin", "gestor", "analista"), asyncRoute(async (req, res) => {
    const { participations } = z.object({ participations: z.array(participationSchema).min(1).max(500) }).parse(req.body);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const created = [];
        for (const participation of participations) {
            created.push(await insertParticipation(client, participation, req.user.id));
        }
        await client.query(
            `INSERT INTO audit_logs (user_id, action, resource, resource_id, ip_address, details)
             VALUES ($1, 'participation.bulk_create', 'participation', NULL, $2, $3)`,
            [req.user.id, req.ip, JSON.stringify({ count: created.length })]
        );
        await client.query("COMMIT");
        res.status(201).json({ data: created, count: created.length });
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}));

router.get("/empresa/:empresaId", asyncRoute(async (req, res) => {
    const empresaId = z.coerce.number().int().positive().parse(req.params.empresaId);
    if (req.user.role === "empresa" && Number(req.user.companyId) !== empresaId) {
        throw new AppError(403, "Você só pode acessar os dados da sua organização.");
    }
    const exists = await pool.query("SELECT 1 FROM companies WHERE id = $1", [empresaId]);
    if (!exists.rowCount) throw new AppError(404, "Empresa não encontrada.");
    const result = await pool.query(
        `SELECT p.id, p.participation_date AS "dataParticipacao", p.status,
                p.hours_dedicated AS "horasDedicadas", p.satisfaction AS satisfacao,
                p.perceived_impact AS "impactoPercebido", a.id AS "acaoId", a.name AS "acaoNome",
                a.category AS "tipoAcao", cc.id AS "contatoId", cc.name AS "contatoNome"
         FROM participations p JOIN actions a ON a.id = p.action_id
         LEFT JOIN company_contacts cc ON cc.id = p.contact_id
         WHERE p.company_id = $1 ORDER BY p.participation_date DESC`, [empresaId]
    );
    res.json({ data: result.rows });
}));

router.delete("/:id", requireRole("admin", "gestor"), asyncRoute(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const result = await pool.query("DELETE FROM participations WHERE id = $1 RETURNING id", [id]);
    if (!result.rowCount) throw new AppError(404, "Participação não encontrada.");
    await recordAudit(req, "participation.delete", "participation", id);
    res.status(204).end();
}));

module.exports = router;