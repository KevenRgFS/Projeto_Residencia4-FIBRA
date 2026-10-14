const express = require("express");
const { asyncRoute } = require("../errors");
const pool = require("../db");
const { syncHubSpotCompanies } = require("../hubspot");

const router = express.Router();

router.get("/", asyncRoute(async (req, res) => {
    const result = await pool.query("SELECT id, source, status, records_processed AS \"recordsProcessed\", error_message AS \"errorMessage\", started_at AS \"startedAt\", finished_at AS \"finishedAt\" FROM sync_runs ORDER BY started_at DESC LIMIT 50");
    res.json({ data: result.rows });
}));

router.post("/hubspot", asyncRoute(async (req, res) => {
    const result = await syncHubSpotCompanies();
    res.json({ data: result });
}));

module.exports = router;