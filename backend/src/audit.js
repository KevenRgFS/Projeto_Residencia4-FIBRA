const pool = require("./db");

async function recordAudit(req, action, resource, resourceId, details = {}) {
    await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, ip_address, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user?.id || null, action, resource, String(resourceId ?? ""), req.ip, JSON.stringify(details)]
    );
}

module.exports = { recordAudit };