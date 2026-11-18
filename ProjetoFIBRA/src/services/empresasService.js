import { supabase } from "../lib/supabaseClient";

function calcularTempoRelativo(dataIso) {
  if (!dataIso) return "Sem interação";
  const data = new Date(dataIso);
  const agora = new Date();
  const diffDias = Math.floor((agora - data) / (1000 * 60 * 60 * 24));

  if (diffDias <= 0) return "Hoje";
  if (diffDias === 1) return "1 dia";
  return `${diffDias} dias`;
}

function pontuarParticipacao(p) {
  if (p.status === "concluiu") return 90;
  if (p.status === "presente") return 75;
  return 55;
}

export async function carregarDiretorioEmpresas() {
  const [
    { data: empresas, error: errEmp },
    { data: participacoes, error: errPart },
    { data: interacoes, error: errInter },
    { data: envios, error: errEnvios },
  ] = await Promise.all([
    supabase
      .from("empresa")
      .select("id_empresa, nome_empresa, setor, porte, situacao_cadastral")
      .order("nome_empresa", { ascending: true }),
    supabase.from("participacao").select("*"),
    supabase
      .from("crm_interacao")
      .select("id_empresa, data")
      .order("data", { ascending: false }),
    supabase.from("envios").select("empresa_id, pilar"),
  ]);

  if (errEmp) throw errEmp;
  if (errPart) throw errPart;
  if (errInter) throw errInter;
  if (errEnvios) throw errEnvios;

  const listaEmpresas = empresas || [];
  const listaParticipacoes = (participacoes || []).filter((p) => p.status !== "cancelou");
  const listaInteracoes = interacoes || [];
  const listaEnvios = envios || [];

  const agora = new Date();

  return listaEmpresas.map((emp) => {
    const partsEmpresa = listaParticipacoes.filter((p) => p.id_empresa === emp.id_empresa);
    let score = 0;
    if (partsEmpresa.length > 0) {
      const soma = partsEmpresa.reduce((acc, p) => acc + pontuarParticipacao(p), 0);
      score = Math.round(soma / partsEmpresa.length);
    }

    const ultimaInter = listaInteracoes.find((i) => i.id_empresa === emp.id_empresa);
    const ultimaInteracao = calcularTempoRelativo(ultimaInter?.data);

    const pilares = [
      ...new Set(
        listaEnvios
          .filter((env) => env.empresa_id === emp.id_empresa && env.pilar)
          .map((env) => env.pilar)
      ),
    ];

    let status = "ativo";
    if (emp.situacao_cadastral && emp.situacao_cadastral.toLowerCase() !== "ativa") {
      status = "inativo";
    } else if (!ultimaInter?.data) {
      status = "risco";
    } else {
      const diasSemContato = Math.floor(
        (agora - new Date(ultimaInter.data)) / (1000 * 60 * 60 * 24)
      );
      if (diasSemContato > 30) {
        status = "risco";
      } else if (diasSemContato > 10) {
        status = "inativo";
      }
    }

    return {
      id: emp.id_empresa,
      nome: emp.nome_empresa,
      setor: emp.setor || "Não informado",
      porte: emp.porte || "Não informado",
      score,
      ultimaInteracao,
      status,
      pilares,
    };
  });
}
