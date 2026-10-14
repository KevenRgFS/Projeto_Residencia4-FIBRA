require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./src/db");
const { requireAuth, requireRole } = require("./src/auth");
const { errorHandler } = require("./src/errors");
const authRoutes = require("./src/routes/auth");
const companyRoutes = require("./src/routes/companies");
const actionRoutes = require("./src/routes/actions");
const participationRoutes = require("./src/routes/participations");
const engagementRoutes = require("./src/routes/engagement");
const dashboardRoutes = require("./src/routes/dashboard");
const insightRoutes = require("./src/routes/insights");
const interactionRoutes = require("./src/routes/interactions");
const syncRoutes = require("./src/routes/sync");

const app = express();
const allowedOrigins = process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()).filter(Boolean);

app.disable("x-powered-by");
app.use(cors({ origin: allowedOrigins?.length ? allowedOrigins : true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
    } catch {
        res.status(503).json({ status: "degraded", database: "unavailable" });
    }
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/empresas", requireAuth, companyRoutes);
app.use("/api/v1/acoes", requireAuth, actionRoutes);
app.use("/api/v1/participacoes", requireAuth, (req, res, next) => {
    if (req.method === "GET" && req.path === "/") return requireRole("admin", "gestor", "analista")(req, res, next);
    return next();
}, participationRoutes);
app.use("/api/v1/engajamento", requireAuth, engagementRoutes);
app.use("/api/v1/dashboard", requireAuth, requireRole("admin", "gestor", "analista"), dashboardRoutes);
app.use("/api/v1/insights", requireAuth, requireRole("admin", "gestor", "analista"), insightRoutes);
app.use("/api/v1/interacoes", requireAuth, requireRole("admin", "gestor", "analista"), interactionRoutes);
app.use("/api/v1/sincronizacao", requireAuth, requireRole("admin"), syncRoutes);

app.use((req, res) => res.status(404).json({ error: "Rota não encontrada." }));
app.use(errorHandler);

if (require.main === module) {
    const port = Number(process.env.PORT) || 3000;
    app.listen(port, () => console.log(`API FIBRA ouvindo na porta ${port}.`));
    if (process.env.HUBSPOT_ACCESS_TOKEN && process.env.HUBSPOT_SYNC_CRON) {
        const cron = require("node-cron");
        const { syncHubSpotCompanies } = require("./src/hubspot");
        if (cron.validate(process.env.HUBSPOT_SYNC_CRON)) {
            cron.schedule(process.env.HUBSPOT_SYNC_CRON, () => {
                syncHubSpotCompanies().catch((error) => console.error("Sincronização agendada falhou:", error.message));
            });
            console.log("Sincronização HubSpot agendada.");
        } else {
            console.error("HUBSPOT_SYNC_CRON inválida; sincronização agendada não iniciada.");
        }
    }
}

module.exports = app;