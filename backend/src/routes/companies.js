const express = require("express");
const { z } = require("zod");
const pool = require("../db");
const { AppError, asyncRoute } = require("../errors");
const { requireRole } = require("../auth");
const { recordAudit } = require("../audit");

const router = express.Router();
const companySchema = z.object({
    name: z.string().trim().min(1).max(160),
    legalName: z.string().trim().max(200).nullable().optional(),
    cnpj: z.string().regex(/^\d{14}$/).nullable().optional(),
    cnae: z.string().max(20).nullable().optional(),
    cnaeDescription: z.string().max(160).nullable().optional(),
    phone: z.string().max(20).nullable().optional(),
    email: z.string().email().max(254).nullable().optional(),
    responsible: z.string().max(120).nullable().optional(),
    sector: z.string().max(100).nullable().optional(),
    size: z.enum(["mei", "micro", "pequena", "media", "grande"]).nullable().optional(),
    organizationType: z.enum(["empresa", "startup", "governo", "academia", "servicos"]).nullable().optional(),
    unionName: z.string().max(120).nullable().optional(),
    employeeCount: z.number().int().nonnegative().nullable().optional(),
    registrationStatus: z.string().max(30).nullable().optional(),
    potential: z.enum(["baixo", "medio", "alto"]).optional(),
}).strict();
const columns = {
    name: "name", legalName: "legal_name", cnpj: "cnpj", cnae: "cnae",
    cnaeDescription: "cnae_description", phone: "phone", email: "email",
    responsible: "responsible", sector: "sector", size: "size",
    organizationType: "organization_type", unionName: "union_name",
    employeeCount: "employee_count", registrationStatus: "registration_status", potential: "potential",
};

function assertCompanyScope(req, companyId) {
    if (req.user.role === "empresa" && Number(req.user.companyId) !== Number(companyId)) {
        throw new AppError(403, "Você só pode acessar os dados da sua organização.");
    }
    if (req.user.role === "empresa" && !req.user.companyId) {
        throw new AppError(403, "Este usuário não está vinculado a uma organização.");
    }
}

router.get("/duplicates", requireRole("admin"), asyncRoute(async (req, res) => {
    const result = await pool.query(
        `SELECT a.id AS first_id, a.name AS first_name, a.cnpj AS first_cnpj,
                b.id AS second_id, b.name AS second_name, b.cnpj AS second_cnpj
         FROM companies a JOIN companies b ON a.id < b.id AND (
             (a.cnpj IS NOT NULL AND regexp_replace(a.cnpj, '\\D', '', 'g') = regexp_replace(b.cnpj, '\\D', '', 'g'))
             OR lower(trim(a.name)) = lower(trim(b.name))
         ) ORDER BY a.name LIMIT 200`
    );
    res.json({ data: result.rows });
}));

router.get("/", asyncRoute(async (req, res) => {
    const query = z.object({
        search: z.string().max(160).optional(), sector: z.string().max(100).optional(),
        size: z.string().max(30).optional(), type: z.string().max(30).optional(),
        union: z.string().max(120).optional(), engagement: z.enum(["baixo", "medio", "alto"]).optional(),
        page: z.coerce.number().int().min(1).default(1), perPage: z.coerce.number().int().min(1).max(100).default(25),
    }).parse(req.query);
    const conditions = [];
    const values = [];
    const addFilter = (sql, value) => { values.push(value); conditions.push(sql.replace("?", `$${values.length}`)); };
    if (query.search) {
        values.push(`%${query.search}%`);
        conditions.push(`(c.name ILIKE $${values.length} OR c.cnpj ILIKE $${values.length})`);
    }
    if (query.sector) addFilter("c.sector = ?", query.sector);
    if (query.size) addFilter("c.size = ?", query.size);
    if (query.type) addFilter("c.organization_type = ?", query.type);
    if (query.union) addFilter("c.union_name = ?", query.union);
    if (query.engagement) addFilter("latest.risk_level = ?", query.engagement);
    if (req.user.role === "empresa") {
        if (!req.user.companyId) throw new AppError(403, "Este usuário não está vinculado a uma organização.");
        values.push(req.user.companyId);
        conditions.push(`c.id = $${values.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    values.push(query.perPage, (query.page - 1) * query.perPage);
    const result = await pool.query(
        `SELECT c.id, c.name, c.cnpj, c.sector, c.size, c.organization_type AS "organizationType",
                c.union_name AS "unionName", c.potential, c.updated_at AS "updatedAt",
                latest.score AS "engagementScore", latest.risk_level AS "riskLevel",
                COUNT(*) OVER()::int AS total
         FROM companies c
         LEFT JOIN LATERAL (SELECT score, risk_level FROM engagement_scores
             WHERE company_id = c.id ORDER BY calculated_at DESC LIMIT 1) latest ON TRUE
         ${where}
         ORDER BY c.name LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values
    );
    const total = result.rows[0]?.total ?? 0;
    res.json({ data: result.rows.map(({ total: _total, ...company }) => company), pagination: { page: query.page, perPage: query.perPage, total } });
}));

router.post("/", requireRole("admin", "gestor", "analista"), asyncRoute(async (req, res) => {
    const company = companySchema.parse(req.body);
    const keys = Object.keys(company);
    const values = keys.map((key) => company[key]);
    const fields = keys.map((key) => columns[key]);
    const result = await pool.query(
        `INSERT INTO companies (${fields.join(", ")}) VALUES (${values.map((_, index) => `$${index + 1}`).join(", ")}) RETURNING *`,
        values
    );
    await recordAudit(req, "company.create", "company", result.rows[0].id);
    res.status(201).json({ data: result.rows[0] });
}));

router.get("/:id", asyncRoute(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    assertCompanyScope(req, id);
    const result = await pool.query(
        `SELECT c.*,
                COALESCE((SELECT json_agg(addresses) FROM company_addresses addresses WHERE addresses.company_id = c.id), '[]'::json) AS addresses,
                COALESCE((SELECT json_agg(contacts) FROM company_contacts contacts WHERE contacts.company_id = c.id), '[]'::json) AS contacts
         FROM companies c WHERE c.id = $1`, [id]
    );
    if (!result.rowCount) throw new AppError(404, "Empresa não encontrada.");
    res.json({ data: result.rows[0] });
}));

router.patch("/:id", requireRole("admin", "gestor", "analista"), asyncRoute(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const company = companySchema.partial().refine((value) => Object.keys(value).length > 0, "Informe ao menos um campo.").parse(req.body);
    const keys = Object.keys(company);
    const values = keys.map((key) => company[key]);
    const assignments = keys.map((key, index) => `${columns[key]} = $${index + 1}`);
    values.push(id);
    const result = await pool.query(
        `UPDATE companies SET ${assignments.join(", ")}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`, values
    );
    if (!result.rowCount) throw new AppError(404, "Empresa não encontrada.");
    await recordAudit(req, "company.update", "company", id, { fields: keys });
    res.json({ data: result.rows[0] });
}));

router.post("/:id/merge", requireRole("admin"), asyncRoute(async (req, res) => {
    const keptId = z.coerce.number().int().positive().parse(req.params.id);
    const { mergedCompanyId } = z.object({ mergedCompanyId: z.coerce.number().int().positive() }).parse(req.body);
    if (keptId === mergedCompanyId) throw new AppError(400, "Selecione duas empresas diferentes.");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const found = await client.query("SELECT * FROM companies WHERE id = ANY($1::bigint[]) FOR UPDATE", [[keptId, mergedCompanyId]]);
        if (found.rowCount !== 2) throw new AppError(404, "Uma das empresas não foi encontrada.");
        const merged = found.rows.find((row) => Number(row.id) === mergedCompanyId);
        await client.query("INSERT INTO company_merges (kept_company_id, merged_company_id, merged_company_snapshot, merged_by) VALUES ($1, $2, $3, $4)", [keptId, mergedCompanyId, JSON.stringify(merged), req.user.id]);
        for (const table of ["company_addresses", "company_contacts", "participations", "crm_interactions", "engagement_scores"]) {
            const column = table === "company_addresses" || table === "company_contacts" ? "company_id" : "company_id";
            await client.query(`UPDATE ${table} SET ${column} = $1 WHERE ${column} = $2`, [keptId, mergedCompanyId]);
        }
        await client.query(
            `UPDATE companies SET
                legal_name = COALESCE(legal_name, $1), cnpj = COALESCE(cnpj, $2), sector = COALESCE(sector, $3),
                size = COALESCE(size, $4), organization_type = COALESCE(organization_type, $5),
                union_name = COALESCE(union_name, $6), updated_at = NOW()
             WHERE id = $7`,
            [merged.legal_name, merged.cnpj, merged.sector, merged.size, merged.organization_type, merged.union_name, keptId]
        );
        await client.query("DELETE FROM companies WHERE id = $1", [mergedCompanyId]);
        await client.query("INSERT INTO audit_logs (user_id, action, resource, resource_id, ip_address, details) VALUES ($1, 'company.merge', 'company', $2, $3, $4)", [req.user.id, String(keptId), req.ip, JSON.stringify({ mergedCompanyId })]);
        await client.query("COMMIT");
        res.json({ message: "Empresas mescladas com sucesso.", keptCompanyId: keptId, mergedCompanyId });
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}));

module.exports = router;