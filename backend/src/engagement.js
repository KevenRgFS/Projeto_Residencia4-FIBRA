const pool = require("./db");

function scoreActivity({ completed, actionTypes, interactions }) {
    return Math.min(10, Number((completed * 1.2 + actionTypes * 0.5 + interactions * 0.35).toFixed(2)));
}

function riskFor({ score, lastParticipation, potential }) {
    const inactiveForSixMonths = !lastParticipation ||
        (Date.now() - new Date(lastParticipation).getTime()) >= 180 * 24 * 60 * 60 * 1000;
    if (inactiveForSixMonths && potential === "alto") return "alto";
    if (score < 3.5 || inactiveForSixMonths) return "medio";
    return "baixo";
}

async function getEngagement(companyId) {
    const result = await pool.query(
        `SELECT c.id AS company_id, c.potential,
                COUNT(DISTINCT p.id) FILTER (WHERE p.status IN ('presente', 'concluiu'))::int AS completed,
                COUNT(DISTINCT a.category) FILTER (WHERE p.status IN ('presente', 'concluiu'))::int AS "actionTypes",
                COUNT(DISTINCT i.id)::int AS interactions,
                MAX(p.participation_date) FILTER (WHERE p.status IN ('presente', 'concluiu')) AS last_participation,
                MAX(i.occurred_at) AS last_interaction
         FROM companies c
         LEFT JOIN participations p ON p.company_id = c.id
             AND p.participation_date >= CURRENT_DATE - INTERVAL '180 days'
         LEFT JOIN actions a ON a.id = p.action_id
         LEFT JOIN crm_interactions i ON i.company_id = c.id
             AND i.occurred_at >= NOW() - INTERVAL '180 days'
         WHERE c.id = $1
         GROUP BY c.id`,
        [companyId]
    );
    if (!result.rowCount) return null;

    const activity = result.rows[0];
    const score = scoreActivity(activity);
    const riskLevel = riskFor({ score, lastParticipation: activity.last_participation, potential: activity.potential });
    const current = await pool.query(
        `SELECT score, risk_level, suggested_action, is_overridden, calculated_at
         FROM engagement_scores WHERE company_id = $1 ORDER BY calculated_at DESC LIMIT 1`,
        [companyId]
    );

    if (current.rows[0]?.is_overridden) {
        return { ...current.rows[0], companyId: Number(companyId), lastParticipation: activity.last_participation,
            totalParticipations: activity.completed, score: Number(current.rows[0].score), manuallyOverridden: true };
    }

    const suggestedAction = riskLevel === "alto"
        ? "Avaliar contato de reativação e convite para uma ação do Hub."
        : riskLevel === "medio"
            ? "Revisar o histórico recente e planejar um próximo contato."
            : "Manter o relacionamento e acompanhar as próximas ações.";
    const saved = await pool.query(
        `INSERT INTO engagement_scores (company_id, score, risk_level, suggested_action)
         VALUES ($1, $2, $3, $4)
         RETURNING score, risk_level, suggested_action, is_overridden, calculated_at`,
        [companyId, score, riskLevel, suggestedAction]
    );
    return { ...saved.rows[0], companyId: Number(companyId), lastParticipation: activity.last_participation,
        lastInteraction: activity.last_interaction, totalParticipations: activity.completed,
        score: Number(saved.rows[0].score), manuallyOverridden: false };
}

module.exports = { getEngagement, riskFor, scoreActivity };