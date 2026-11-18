const CHAVE = "fibra_usuario";
const espera = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function entrar(nome, senha) {
  await espera(400);
  if (!senha) throw new Error("Informe a senha.");

  sessionStorage.setItem(CHAVE, nome);
  return { nome };
}

export async function entrarComGoogle() {
  throw new Error("O login com Google ainda não está conectado.");
}

export function estaLogado() {
  return sessionStorage.getItem(CHAVE) !== null;
}

export function sair() {
  sessionStorage.removeItem(CHAVE);
}
