const bcrypt = require("bcryptjs");
const pool = require("./db");

async function createUser() {
    const { USER_NAME, USER_EMAIL, USER_PASSWORD, USER_ROLE = "admin", USER_COMPANY_ID } = process.env;
    if (!USER_NAME || !USER_EMAIL || !USER_PASSWORD) {
        throw new Error("Defina USER_NAME, USER_EMAIL e USER_PASSWORD no ambiente.");
    }
    if (USER_PASSWORD.length < 12) throw new Error("USER_PASSWORD deve ter pelo menos 12 caracteres.");
    if (!["admin", "gestor", "analista", "empresa"].includes(USER_ROLE)) {
        throw new Error("USER_ROLE inválido.");
    }

    const passwordHash = await bcrypt.hash(USER_PASSWORD, 12);
    await pool.query(
        `INSERT INTO users (name, email, password_hash, role, company_id)
         VALUES ($1, lower($2), $3, $4, $5)`,
        [USER_NAME, USER_EMAIL, passwordHash, USER_ROLE, USER_COMPANY_ID || null]
    );
    console.log(`Usuário ${USER_EMAIL} criado com o perfil ${USER_ROLE}.`);
}

createUser()
    .catch((error) => {
        console.error("Não foi possível criar usuário:", error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());