const bcrypt = require("bcryptjs");
const pool = require("./db");

async function createUser() {
    const { USER_NAME, USER_EMAIL, USER_PASSWORD, USER_ROLE = "admin" } = process.env;
    if (!USER_NAME || !USER_EMAIL || !USER_PASSWORD) {
        throw new Error("Defina USER_NAME, USER_EMAIL e USER_PASSWORD no ambiente.");
    }
    if (USER_PASSWORD.length < 12) throw new Error("USER_PASSWORD deve ter pelo menos 12 caracteres.");
    if (USER_ROLE !== "admin") {
        throw new Error("O primeiro usuário deve ser o administrador-chefe (USER_ROLE=admin).");
    }

    const existingAdmin = await pool.query("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1");
    if (existingAdmin.rowCount) {
        throw new Error("Já existe um administrador. Crie os demais perfis pelo painel de usuários.");
    }

    const passwordHash = await bcrypt.hash(USER_PASSWORD, 12);
    await pool.query(
        `INSERT INTO users (name, email, password_hash, role, company_id)
         VALUES ($1, lower($2), $3, 'admin', NULL)`,
        [USER_NAME, USER_EMAIL, passwordHash]
    );
    console.log(`Administrador-chefe ${USER_EMAIL} criado.`);
}

createUser()
    .catch((error) => {
        console.error("Não foi possível criar usuário:", error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());