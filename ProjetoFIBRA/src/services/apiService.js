const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1").replace(/\/$/, "");
const TOKEN_KEY = "fibra_token";

export async function requisitarApi(caminho, { metodo = "GET", corpo } = {}) {
  const cabecalhos = {};
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) cabecalhos.Authorization = `Bearer ${token}`;
  if (corpo && !(corpo instanceof FormData)) cabecalhos["Content-Type"] = "application/json";

  let resposta;
  try {
    resposta = await fetch(`${API_BASE}${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: corpo instanceof FormData ? corpo : corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new Error("Não foi possível conectar à API. Verifique se o backend está em execução.");
  }

  const dados = resposta.status === 204 ? null : await resposta.json();
  if (!resposta.ok) throw new Error(dados?.error || "Não foi possível concluir a operação.");
  return dados;
}

export function enviarArquivoApi(caminho, arquivo) {
  const corpo = new FormData();
  corpo.append("arquivo", arquivo);
  return requisitarApi(caminho, { metodo: "POST", corpo });
}
