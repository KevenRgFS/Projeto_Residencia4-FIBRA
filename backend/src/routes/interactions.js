const express = require("express");
const { z } = require("zod");
const pool = require("../db");
const { asyncRoute } = require("../errors");
const { recordAudit } = require("../audit");

const router = express.Router();
const interactionSchema = z.object({
    empresaId: z.coerce.number().int().positive(),
    contatoId: z.coerce.number().int().positive().nullable().optional(),
    data: z.iso.datetime().optional(),
    canal: z.enum(["email", "telefone", "reuniao", "whatsapp", "outro"]),
    tipo: z.enum(["prospeccao", "suporte", "follow_up", "outro"]),
    resultado: z.string().max(300).nullable().optional(),
    observacoes: z.string().max(5000).nullable().optional(),
});

router.get("/", asyncRoute(async (req, res) => {
    const query = z.object({ empresaId: z.coerce.number().int().positive().optional() }).parse(req.query);
    const conditions = [];
    const values = [];
    if (query.empresaId) { values.push(query.empresaId); conditions.push(`i.company_id = $${values.length}`); }
    const result = await pool.query(
        `SELECT i.id, i.company_id AS "empresaId", c.name AS "empresaNome",
                i.occurred_at AS data, i.channel AS canal, i.type AS tipo,
                i.result AS resultado, i.notes AS observacoes
         FROM crm_interactions i JOIN companies c ON c.id = i.company_id
         ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
         ORDER BY i.occurred_at DESC LIMIT 500`, values
    );
    res.json({ data: result.rows });
}));

router.post("/", asyncRoute(async (req, res) => {
    const interaction = interactionSchema.parse(req.body);
    if (interaction.contatoId) {
        const contact = await pool.query(
            "SELECT 1 FROM company_contacts WHERE id = $1 AND company_id = $2",
            [interaction.contatoId, interaction.empresaId]
        );
        if (!contact.rowCount) {
            const error = new Error("O contato informado não pertence à empresa selecionada.");
            error.status = 400;
            throw error;
        }
    }
    const result = await pool.query(
        `INSERT INTO crm_interactions (company_id, contact_id, user_id, occurred_at, channel, type, result, notes)
         VALUES ($1, $2, $3, COALESCE($4::timestamptz, NOW()), $5, $6, $7, $8) RETURNING *`,
        [interaction.empresaId, interaction.contatoId || null, req.user.id, interaction.data || null,
            interaction.canal, interaction.tipo, interaction.resultado || null, interaction.observacoes || null]
    );
    await recordAudit(req, "interaction.create", "interaction", result.rows[0].id);
    res.status(201).json({ data: result.rows[0] });
}));

module.exports = router;