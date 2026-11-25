import { requisitarApi } from "./apiService";

const TOKEN_KEY = "fibra_token";
const USER_KEY = "fibra_usuario";

export async function entrar(email, senha) {
  const resposta = await requisitarApi("/auth/login", {
    metodo: "POST",
    corpo: { email, password: senha },
  });
  sessionStorage.setItem(TOKEN_KEY, resposta.token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(resposta.user));
  return resposta.user;
}

export async function entrarComGoogle() {
  throw new Error("O login com Google ainda não está conectado.");
}

export function estaLogado() {
  return Boolean(sessionStorage.getItem(TOKEN_KEY) && obterUsuario());
}

export function obterUsuario() {
  const armazenado = sessionStorage.getItem(USER_KEY);
  if (!armazenado) return null;

  try {
    return JSON.parse(armazenado);
  } catch {
    sair();
    return null;
  }
}

export function sair() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}
