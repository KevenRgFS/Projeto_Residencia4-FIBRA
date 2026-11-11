const test = require("node:test");
const assert = require("node:assert/strict");
const pool = require("../src/db");

test("connects to the configured PostgreSQL database", async () => {
    assert.ok(process.env.DATABASE_URL, "DATABASE_URL precisa estar configurada em backend/.env");

    const { rows } = await pool.query("SELECT 1 AS result");
    assert.equal(rows[0].result, 1);
});

test.after(async () => pool.end());
