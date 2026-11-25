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
function gerarToken(role = "admin") {
    return jwt.sign(
        { id: 1, role, name: "Usuário Teste" },
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
    async function requisitar(caminho, { metodo = "POST", body, autenticado = true, role = "admin" } = {}) {
        const headers = { "Content-Type": "application/json" };
        if (autenticado) {
            headers.Authorization = `Bearer ${gerarToken(role)}`;
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

test("Autorização: visitante pode consultar, mas não gravar empresas", async (context) => {
    const { requisitar } = await iniciarServidor(context);

    const { status, json } = await requisitar("/api/v1/empresas", {
        body: { name: "Empresa Teste" },
        role: "visitante",
    });

    assert.equal(status, 403);
    assert.equal(json.error, "Você não tem permissão para esta operação.");
});

test("Autorização: visitante não pode criar ou administrar perfis", async (context) => {
    const { requisitar } = await iniciarServidor(context);

    const { status, json } = await requisitar("/api/v1/usuarios", {
        role: "visitante",
        metodo: "GET",
    });

    assert.equal(status, 403);
    assert.equal(json.error, "Você não tem permissão para esta operação.");
});

test("Autorização: gestor não pode administrar perfis", async (context) => {
    const { requisitar } = await iniciarServidor(context);

    const { status, json } = await requisitar("/api/v1/usuarios", {
        body: { name: "Novo usuário" },
        role: "gestor",
    });

    assert.equal(status, 403);
    assert.equal(json.error, "Você não tem permissão para esta operação.");
});

test("Admin: perfis novos ficam pendentes até serem autorizados", async (context) => {
    const pendente = { id: 8, name: "Visitante Teste", email: "visitante@fibra.org.br", role: "visitante", status: "pendente" };
    const ativo = { ...pendente, status: "ativo" };
    context.mock.method(pool, "query", async (sql) => {
        if (sql.includes("INSERT INTO users")) return { rows: [pendente], rowCount: 1 };
        if (sql.includes("UPDATE users SET status = 'ativo'")) return { rows: [ativo], rowCount: 1 };
        return { rows: [], rowCount: 0 };
    });

    const { requisitar } = await iniciarServidor(context);
    const novo = await requisitar("/api/v1/usuarios", {
        body: {
            name: "Visitante Teste",
            email: "visitante@fibra.org.br",
            password: "senha-forte-com-12",
            role: "visitante",
        },
    });
    const autorizado = await requisitar("/api/v1/usuarios/8/autorizar");

    assert.equal(novo.status, 201);
    assert.equal(novo.json.data.status, "pendente");
    assert.equal(novo.json.data.role, "visitante");
    assert.equal("password" in novo.json.data, false);
    assert.equal(autorizado.status, 200);
    assert.equal(autorizado.json.data.status, "ativo");
});

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

test("Gestor: deve cadastrar manualmente uma empresa", async (context) => {
    // Simula a resposta do banco de dados para testar a autorização e a rota
    context.mock.method(pool, "query", async () => ({
        rows: [{ id: 42, name: "Indústria Amazônia S.A.", cnpj: "12345678000199", size: "media" }],
        rowCount: 1,
    }));

    const { requisitar } = await iniciarServidor(context);

    const { status, json } = await requisitar("/api/v1/empresas", {
        role: "gestor",
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
