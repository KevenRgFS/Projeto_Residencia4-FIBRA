const fs = require("node:fs/promises");
const path = require("node:path");
const pool = require("./db");

async function migrate() {
    if (!process.env.DATABASE_URL) {
        throw new Error("Defina DATABASE_URL antes de executar as migrations.");
    }

    const schema = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
    await pool.query(schema);
    console.log("Schema do PostgreSQL aplicado com sucesso.");
}

migrate()
    .catch((error) => {
        console.error("Falha ao aplicar schema:", error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());