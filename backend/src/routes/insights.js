const express = require("express");
const pool = require("../db");
const { asyncRoute } = require("../errors");

const router = express.Router();

router.get("/", asyncRoute(async (req, res) => {
    const [atRisk, sectors, dataQuality] = await Promise.all([
        pool.query(
            `SELECT c.id, c.name, c.sector, c.potential,
                    MAX(p.participation_date) FILTER (WHERE p.status IN ('presente', 'concluiu')) AS "ultimaParticipacao",
                    COUNT(p.id) FILTER (WHERE p.status IN ('presente', 'concluiu'))::int AS "participacoesRecentes"
             FROM companies c LEFT JOIN participations p ON p.company_id = c.id
                AND p.participation_date >= CURRENT_DATE - INTERVAL '180 days'
             WHERE c.potential = 'alto'
             GROUP BY c.id HAVING COUNT(p.id) FILTER (WHERE p.status IN ('presente', 'concluiu')) = 0
             ORDER BY c.name LIMIT 100`
        ),
        pool.query(
            `SELECT sector, COUNT(*)::int AS organizations FROM companies
             WHERE sector IS NOT NULL GROUP BY sector ORDER BY organizations DESC LIMIT 20`
        ),
        pool.query("SELECT COUNT(*)::int AS open FROM data_quality_issues WHERE resolved_at IS NULL"),
    ]);
    res.json({
        data: {
            alerts: atRisk.rows.map((company) => ({
                ...company,
                type: "reativacao",
                message: "Organização de alto potencial sem participação registrada nos últimos 6 meses.",
                suggestedAction: "Revisar o relacionamento e avaliar uma ação de reativação.",
            })),
            organizationsBySector: sectors.rows,
            dataQuality: { openIssues: dataQuality.rows[0].open },
            generatedAt: new Date().toISOString(),
            mode: "regras determinísticas; não é uma previsão de modelo de IA",
        },
    });
}));

module.exports = router;