const pool = require("./db");

const properties = [
    "name", "phone", "industry", "numberofemployees", "address", "address2",
    "city", "state", "zip", "country", "domain", "description", "hs_lead_status",
];

async function requestPage(url, attempt = 0) {
    let response;
    try {
        response = await fetch(url, {
            headers: { Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}` },
            signal: AbortSignal.timeout(15000),
        });
    } catch (error) {
        if (attempt >= 4) throw error;
        await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** attempt, 10000)));
        return requestPage(url, attempt + 1);
    }
    if ((response.status === 429 || response.status >= 500) && attempt < 4) {
        const retryAfter = Number(response.headers.get("retry-after")) * 1000;
        const delay = retryAfter || Math.min(1000 * 2 ** attempt, 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return requestPage(url, attempt + 1);
    }
    if (!response.ok) {
        throw new Error(`HubSpot retornou HTTP ${response.status}.`);
    }
    return response.json();
}

function companyData(record) {
    const values = record.properties || {};
    const name = values.name?.trim();
    if (!name) return { issue: "Registro HubSpot sem nome de empresa.", payload: record };
    const employees = Number.parseInt(values.numberofemployees, 10);
    const size = Number.isFinite(employees)
        ? employees <= 1 ? "mei" : employees <= 9 ? "micro" : employees <= 49 ? "pequena" : employees <= 249 ? "media" : "grande"
        : null;
    return {
        hubspotId: record.id,
        name,
        phone: values.phone || null,
        sector: values.industry || null,
        employeeCount: Number.isFinite(employees) && employees >= 0 ? employees : null,
        size,
        registrationStatus: values.hs_lead_status || null,
        address: {
            street: values.address || null,
            complement: values.address2 || null,
            city: values.city || null,
            state: values.state?.slice(0, 2) || null,
            postalCode: values.zip?.replace(/\D/g, "").slice(0, 8) || null,
        },
    };
}

async function syncHubSpotCompanies() {
    if (!process.env.HUBSPOT_ACCESS_TOKEN) throw new Error("HUBSPOT_ACCESS_TOKEN não configurado.");
    const run = await pool.query("INSERT INTO sync_runs (source, status) VALUES ('hubspot', 'running') RETURNING id");
    const runId = run.rows[0].id;
    let processed = 0;
    let after;
    try {
        do {
            const url = new URL("https://api.hubapi.com/crm/v3/objects/companies");
            url.searchParams.set("limit", "100");
            url.searchParams.set("properties", [...properties, ...(process.env.HUBSPOT_CNPJ_PROPERTY ? [process.env.HUBSPOT_CNPJ_PROPERTY] : [])].join(","));
            if (after) url.searchParams.set("after", after);
            const page = await requestPage(url);
            for (const record of page.results || []) {
                const mapped = companyData(record);
                if (mapped.issue) {
                    await pool.query(
                        "INSERT INTO data_quality_issues (source, source_record_id, issue, payload) VALUES ('hubspot', $1, $2, $3)",
                        [record.id, mapped.issue, JSON.stringify(record)]
                    );
                    processed += 1;
                    continue;
                }
                try {
                    const cnpjValue = process.env.HUBSPOT_CNPJ_PROPERTY
                        ? record.properties?.[process.env.HUBSPOT_CNPJ_PROPERTY]?.replace(/\D/g, "") || null
                        : null;
                    await pool.query(
                        `INSERT INTO companies (hubspot_id, name, cnpj, phone, sector, employee_count, size, registration_status, source)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'hubspot')
                         ON CONFLICT (hubspot_id) DO UPDATE SET
                            name = EXCLUDED.name, cnpj = COALESCE(EXCLUDED.cnpj, companies.cnpj),
                            phone = EXCLUDED.phone, sector = EXCLUDED.sector,
                            employee_count = EXCLUDED.employee_count, size = COALESCE(EXCLUDED.size, companies.size),
                            registration_status = EXCLUDED.registration_status, source = 'hubspot', updated_at = NOW()`,
                        [mapped.hubspotId, mapped.name, /^\d{14}$/.test(cnpjValue || "") ? cnpjValue : null,
                            mapped.phone, mapped.sector, mapped.employeeCount, mapped.size, mapped.registrationStatus]
                    );
                    if (Object.values(mapped.address).some(Boolean)) {
                        const company = await pool.query("SELECT id FROM companies WHERE hubspot_id = $1", [mapped.hubspotId]);
                        await pool.query(
                            `INSERT INTO company_addresses (company_id, street, complement, city, state, postal_code)
                             SELECT $1, $2, $3, $4, $5, $6
                             WHERE NOT EXISTS (SELECT 1 FROM company_addresses WHERE company_id = $1 AND street IS NOT DISTINCT FROM $2 AND city IS NOT DISTINCT FROM $4)`,
                            [company.rows[0].id, mapped.address.street, mapped.address.complement,
                                mapped.address.city, mapped.address.state, mapped.address.postalCode]
                        );
                    }
                } catch (error) {
                    await pool.query(
                        "INSERT INTO data_quality_issues (source, source_record_id, issue, payload) VALUES ('hubspot', $1, $2, $3)",
                        [record.id, `Falha ao importar registro: ${error.message}`, JSON.stringify(record)]
                    );
                }
                processed += 1;
            }
            after = page.paging?.next?.after;
        } while (after);

        await pool.query("UPDATE sync_runs SET status = 'success', records_processed = $1, finished_at = NOW() WHERE id = $2", [processed, runId]);
        return { runId, recordsProcessed: processed };
    } catch (error) {
        await pool.query("UPDATE sync_runs SET status = 'failed', records_processed = $1, error_message = $2, finished_at = NOW() WHERE id = $3", [processed, error.message, runId]);
        throw error;
    }
}

module.exports = { syncHubSpotCompanies };