const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

// Define uma chave secreta de teste caso não exista no ambiente
process.env.JWT_SECRET = process.env.JWT_SECRET || "chave-secreta-de-teste-fibra";

const app = require("../app");
const pool = require("../src/db");

/**
 * Função auxiliar para gerar um token JWT válido de administrador para os testes
 */
function gerarTokenAdmin() {
    return jwt.sign(
        { id: 1, role: "admin", name: "Admin Teste" },
        process.env.JWT_SECRET,
        { issuer: "fibra-api", audience: "fibra-platform", expiresIn: "1h" }
    );
}

/**
 * Função auxiliar para subir o servidor em uma porta livre e fazer requisições JSON
 */
async function iniciarServidor(context) {
    const server = app.listen(0);
    context.after(() => server.close());
    await new Promise((resolve) => server.once("listening", resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const token = gerarTokenAdmin();

    async function requisitar(caminho, { metodo = "POST", body, autenticado = true } = {}) {
        const headers = { "Content-Type": "application/json" };
        if (autenticado) {
            headers.Authorization = `Bearer ${token}`;
        }
        const response = await fetch(`${baseUrl}${caminho}`, {
            method: metodo,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const json = await response.json();
        return { status: response.status, json };
    }

    return { requisitar };
}

// ============================================================================
// 1. TESTES DE VALIDAÇÃO DE LOGIN (/api/v1/auth/login)
// ============================================================================

test("Login: deve rejeitar e-mail em formato inválido (sem @)", async (context) => {
    const { requisitar } = await iniciarServidor(context);

    const { status, json } = await requisitar("/api/v1/auth/login", {
        autenticado: false,
        body: { email: "email-invalido-sem-arroba", password: "123" },
    });

    assert.equal(status, 400);
    assert.equal(json.error, "Dados inválidos.");
    assert.ok(json.details.some((d) => d.path === "email"));
});

test("Login: deve rejeitar quando a senha está vazia", async (context) => {
    const { requisitar } = await iniciarServidor(context);

    const { status, json } = await requisitar("/api/v1/auth/login", {
        autenticado: false,
        body: { email: "admin@fibra.org.br", password: "" },
    });

    assert.equal(status, 400);
    assert.equal(json.error, "Dados inválidos.");
    assert.ok(json.details.some((d) => d.path === "password"));
});

// ============================================================================
// 2. TESTES DE VALIDAÇÃO DE EMPRESAS (/api/v1/empresas)
// ============================================================================

test("Empresas: deve rejeitar cadastro sem o campo obrigatório 'name'", async (context) => {
    const { requisitar } = await iniciarServidor(context);

    const { status, json } = await requisitar("/api/v1/empresas", {
        body: { cnpj: "12345678000199", sector: "Tecnologia" },
    });

    assert.equal(status, 400);
    assert.equal(json.error, "Dados inválidos.");
    assert.ok(json.details.some((d) => d.path === "name"));
});

test("Empresas: deve rejeitar CNPJ que não tenha exatamente 14 dígitos numéricos", async (context) => {
    const { requisitar } = await iniciarServidor(context);

    const { status, json } = await requisitar("/api/v1/empresas", {
        body: { name: "Empresa Teste", cnpj: "123.456/0001-AB" },
    });

    assert.equal(status, 400);
    assert.equal(json.error, "Dados inválidos.");
    assert.ok(json.details.some((d) => d.path === "cnpj"));
});

test("Empresas: deve rejeitar porte ('size') fora dos valores permitidos", async (context) => {
    const { requisitar } = await iniciarServidor(context);

    const { status, json } = await requisitar("/api/v1/empresas", {
        body: { name: "Empresa Teste", size: "gigante" }, // Permitidos: mei, micro, pequena, media, grande
    });

    assert.equal(status, 400);
    assert.equal(json.error, "Dados inválidos.");
    assert.ok(json.details.some((d) => d.path === "size"));
});

test("Empresas: deve rejeitar número negativo de funcionários ('employeeCount')", async (context) => {
    const { requisitar } = await iniciarServidor(context);

    const { status, json } = await requisitar("/api/v1/empresas", {
        body: { name: "Empresa Teste", employeeCount: -5 },
    });

    assert.equal(status, 400);
    assert.equal(json.error, "Dados inválidos.");
    assert.ok(json.details.some((d) => d.path === "employeeCount"));
});

test("Empresas: deve rejeitar campos desconhecidos não previstos no esquema (.strict())", async (context) => {
    const { requisitar } = await iniciarServidor(context);

    const { status, json } = await requisitar("/api/v1/empresas", {
        body: { name: "Empresa Teste", campoInventado: "valor" },
    });

    assert.equal(status, 400);
    assert.equal(json.error, "Dados inválidos.");
});

test("Empresas (Caminho Feliz): deve aceitar dados válidos e retornar 201 Created", async (context) => {
    // Simula a resposta do banco de dados para testar apenas a camada de validação e rota
    context.mock.method(pool, "query", async () => ({
        rows: [{ id: 42, name: "Indústria Amazônia S.A.", cnpj: "12345678000199", size: "media" }],
        rowCount: 1,
    }));

    const { requisitar } = await iniciarServidor(context);

    const { status, json } = await requisitar("/api/v1/empresas", {
        body: {
            name: "Indústria Amazônia S.A.",
            cnpj: "12345678000199",
            email: "contato@amazonia.com.br",
            size: "media",
            organizationType: "empresa",
            employeeCount: 120,
            potential: "alto",
        },
    });

    assert.equal(status, 201);
    assert.equal(json.data.name, "Indústria Amazônia S.A.");
});

// ============================================================================
// 3. TESTES DE VALIDAÇÃO DE AÇÕES (/api/v1/acoes)
// ============================================================================

test("Ações: deve rejeitar quando a data final ('endDate') é anterior à data inicial ('startDate')", async (context) => {
    const { requisitar } = await iniciarServidor(context);

    const { status, json } = await requisitar("/api/v1/acoes", {
        body: {
            name: "Workshop de Inovação",
            category: "workshop",
            startDate: "2026-10-20",
            endDate: "2026-10-10", // Data final antes da inicial!
        },
    });

    assert.equal(status, 400);
    assert.equal(json.error, "Dados inválidos.");
    assert.ok(
        json.details.some(
            (d) => d.path === "endDate" && d.message === "A data final deve ser igual ou posterior à inicial."
        )
    );
});

// ============================================================================
// 4. TESTES DE VALIDAÇÃO DE PARTICIPAÇÕES (/api/v1/participacoes)
// ============================================================================

test("Participações: deve rejeitar nota de satisfação fora do intervalo de 1 a 5", async (context) => {
    const { requisitar } = await iniciarServidor(context);

    const { status, json } = await requisitar("/api/v1/participacoes", {
        body: {
            empresaId: 1,
            acaoId: 1,
            dataParticipacao: "2026-10-25",
            satisfacao: 10, // Máximo permitido é 5
        },
    });

    assert.equal(status, 400);
    assert.equal(json.error, "Dados inválidos.");
    assert.ok(json.details.some((d) => d.path === "satisfacao"));
});

test.after(async () => pool.end());
