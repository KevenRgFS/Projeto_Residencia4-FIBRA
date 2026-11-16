/* =====================================================================
   PERFIL DO USUÁRIO (hoje: dados de mentira, só para o protótipo)
   ---------------------------------------------------------------------
   Estas 2 funções são os ÚNICOS lugares que vão falar com o Supabase.
   Para conectar, troque o corpo de cada uma, sem mudar o que recebem
   e devolvem. Os comandos do Supabase nos comentários são só ideias.
   ===================================================================== */

const espera = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Guarda as alterações só enquanto a página não for recarregada (F5 volta ao original)
let perfilAtual = {
  nome_completo: "Roberto Silva",
  cargo: "Analista Sênior",
  organizacao: "Federação das Indústrias do Distrito Federal",
  email: "roberto.silva@fibra.org.br",
  telefone: "(61) 99887-1234",
  departamento: "Diagnóstico e Inovação Industrial",
  fuso_horario: "Brasília (GMT-3)",
};

// DEVOLVE: { nome_completo, cargo, organizacao, email, telefone, departamento, fuso_horario }
// SUPABASE (ideia): supabase.from("perfis").select("*").eq("id", usuario.id).single()
export async function buscarPerfil() {
  await espera(300);
  return { ...perfilAtual };
}

// RECEBE: o perfil com os campos já alterados (a "organizacao" não é editável na tela).
// DEVOLVE: o perfil salvo, no mesmo formato de buscarPerfil().
// Se falhar: throw new Error("mensagem que o usuário vai ler").
// SUPABASE (ideia): supabase.from("perfis").update({ ... }).eq("id", usuario.id).select().single()
export async function salvarPerfil(dados) {
  await espera(500);
  perfilAtual = { ...perfilAtual, ...dados };
  return { ...perfilAtual };
}
