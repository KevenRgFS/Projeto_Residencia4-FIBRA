const express = require("express");
const { z } = require("zod");
const pool = require("../db");
const { asyncRoute } = require("../errors");

const router = express.Router();

router.get("/overview", asyncRoute(async (req, res) => {
    const filters = z.object({ inicio: z.iso.date().optional(), fim: z.iso.date().optional() }).parse(req.query);
    const conditions = [];
    const values = [];
    if (filters.inicio) { values.push(filters.inicio); conditions.push(`p.participation_date >= $${values.length}`); }
    if (filters.fim) { values.push(filters.fim); conditions.push(`p.participation_date <= $${values.length}`); }
    const dateFilter = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [companies, actions, participations, sectors, actionTypes, sync] = await Promise.all([
        pool.query("SELECT COUNT(*)::int AS total FROM companies"),
        pool.query("SELECT COUNT(*)::int AS total FROM actions"),
        pool.query(`SELECT COUNT(*)::int AS total FROM participations p ${dateFilter}`, values),
        pool.query(
            `SELECT c.sector, COUNT(DISTINCT p.company_id)::int AS companies,
                    COUNT(p.id)::int AS participations
             FROM companies c LEFT JOIN participations p ON p.company_id = c.id
             ${conditions.length ? `AND ${conditions.join(" AND ")}` : ""}
             GROUP BY c.sector ORDER BY participations DESC`, values
        ),
        pool.query(
            `SELECT a.category AS "actionType", COUNT(p.id)::int AS participations
             FROM actions a LEFT JOIN participations p ON p.action_id = a.id
             ${conditions.length ? `AND ${conditions.map((condition) => condition.replaceAll("p.participation_date", "p.participation_date")).join(" AND ")}` : ""}
             GROUP BY a.category ORDER BY participations DESC`, values
        ),
        pool.query("SELECT MAX(finished_at) FILTER (WHERE status = 'success') AS " + '"lastSuccessfulSync"' + " FROM sync_runs"),
    ]);
    const score = await pool.query(
        `SELECT ROUND(AVG(score), 2)::float AS average FROM (
             SELECT DISTINCT ON (company_id) company_id, score FROM engagement_scores ORDER BY company_id, calculated_at DESC
         ) latest`
    );
    res.json({
        data: {
            totalOrganizacoes: companies.rows[0].total,
            totalAcoes: actions.rows[0].total,
            totalParticipacoes: participations.rows[0].total,
            mediaEngajamento: score.rows[0].average,
            participacoesPorSetor: sectors.rows,
            participacoesPorTipoAcao: actionTypes.rows,
            ultimaSincronizacao: sync.rows[0].lastSuccessfulSync,
        },
    });
}));

module.exports = router;