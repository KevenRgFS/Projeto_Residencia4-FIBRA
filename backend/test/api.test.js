const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../app");
const pool = require("../src/db");

test("protected company endpoint rejects missing token", async (context) => {
    const server = app.listen(0);
    context.after(() => server.close());
    await new Promise((resolve) => server.once("listening", resolve));

    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/empresas`);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Autenticação necessária." });
});

test("unknown API paths return JSON 404", async (context) => {
    const server = app.listen(0);
    context.after(() => server.close());
    await new Promise((resolve) => server.once("listening", resolve));

    const response = await fetch(`http://127.0.0.1:${server.address().port}/missing`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Rota não encontrada." });
});

test.after(async () => pool.end());