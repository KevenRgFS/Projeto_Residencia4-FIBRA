import { supabase } from "../lib/supabaseClient";

function formatarDataRelativa(dataIso) {
  if (!dataIso) return "Data não informada";
  const data = new Date(dataIso);
  const agora = new Date();
  const diffDias = Math.floor((agora - data) / (1000 * 60 * 60 * 24));
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  if (diffDias === 0) return `Hoje, ${hora}`;
  if (diffDias === 1) return `Ontem, ${hora}`;
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) + `, ${hora}`;
}

function pontuarParticipacao(p) {
  if (p.status === "concluiu") return 90;
  if (p.status === "presente") return 75;
  return 55;
}

export async function carregarDadosPainel() {
  const [
    { data: empresas, error: errEmpresas },
    { data: eventos, error: errEventos },
    { data: relatorios, error: errRelatorios },
    { data: envios, error: errEnvios },
    { data: participacoes, error: errPart },
    { data: interacoes, error: errInter },
  ] = await Promise.all([
    supabase.from("empresa").select("id_empresa, nome_empresa, setor, porte, criado_em"),
    supabase.from("evento").select("id_evento, nome, tipo, pilar"),
    supabase.from("relatorio_evento").select("id_relatorio, nome, data_inicio, data_fim"),
    supabase.from("envios").select("id, empresa_id, pilar, tipo_dado, status, created_at"),
    supabase.from("participacao").select("*"),
    supabase
      .from("crm_interacao")
      .select("id_interacao, id_empresa, tipo, resultado, data")
      .order("data", { ascending: false }),
  ]);

  if (errEmpresas) throw errEmpresas;
  if (errEventos) throw errEventos;
  if (errRelatorios) throw errRelatorios;
  if (errEnvios) throw errEnvios;
  if (errPart) throw errPart;
  if (errInter) throw errInter;

  const listaEmpresas = empresas || [];
  const listaEventos = eventos || [];
  const listaRelatorios = relatorios || [];
  const listaEnvios = envios || [];
  const listaParticipacoes = (participacoes || []).filter((p) => p.status !== "cancelou");
  const listaInteracoes = interacoes || [];

  const mapaEmpresas = new Map(listaEmpresas.map((e) => [e.id_empresa, e]));

  const totalEmpresas = listaEmpresas.length;

  const hoje = new Date().toISOString().split("T")[0];
  const ativosRelatorios = listaRelatorios.filter(
    (r) => !r.data_fim || r.data_fim >= hoje
  ).length;
  const programasAtivos = ativosRelatorios > 0 ? ativosRelatorios : listaEventos.length;

  const limite30Dias = new Date();
  limite30Dias.setDate(limite30Dias.getDate() - 30);

  const empresasComInteracaoRecente = new Set(
    listaInteracoes
      .filter((i) => i.data && new Date(i.data) >= limite30Dias)
      .map((i) => i.id_empresa)
  );
  const empresasEmRisco = listaEmpresas.filter(
    (e) => !empresasComInteracaoRecente.has(e.id_empresa)
  ).length;

  let engajamentoMedio = 0;
  if (totalEmpresas > 0 && listaParticipacoes.length > 0) {
    const somaNotas = listaParticipacoes.reduce(
      (acc, p) => acc + pontuarParticipacao(p),
      0
    );
    engajamentoMedio = Number((somaNotas / listaParticipacoes.length).toFixed(1));
  }

  const TODOS_SETORES = [
    { completo: "Construção Civil", curto: "Construção" },
    { completo: "Industria da Informação", curto: "Tecnologia / TI" },
    { completo: "Artefatos, Cimentos, Concretos e Mármores", curto: "Cimentos / Artef." },
    { completo: "Madeira e Mobiliário", curto: "Mobiliário" },
    { completo: "Alimentação de Brasília", curto: "Alimentação" },
    { completo: "Fabricação de Produtos Alimentares de Origem Vegetal", curto: "Alim. Vegetal" },
    { completo: "Vestuário", curto: "Vestuário" },
    { completo: "Fabricação/Reparação de Máquinas Industriais e Elétricas", curto: "Máquinas / Elétr." },
    { completo: "Indústrias Gráficas", curto: "Gráfica" },
    { completo: "Metalúrgicas, Mecânicas e de Material Elétrico", curto: "Metalúrgica" },
    { completo: "Outros", curto: "Outros" },
  ];

  const engajamentoPorSetor = TODOS_SETORES.map(({ completo, curto }) => {
    const empresasDoSetor = listaEmpresas.filter((e) => e.setor === completo);
    const idsSetor = new Set(empresasDoSetor.map((e) => e.id_empresa));
    const totalSetor = empresasDoSetor.length;

    const calcularPercentualPilar = (pilarEnum) => {
      if (totalSetor === 0) return 0;
      const empresasNoPilar = new Set();

      listaEnvios.forEach((env) => {
        if (!idsSetor.has(env.empresa_id)) return;
        if (env.pilar === pilarEnum) {
          empresasNoPilar.add(env.empresa_id);
        }
      });

      return Math.round((empresasNoPilar.size / totalSetor) * 100);
    };

    return {
      setor: curto,
      setorCompleto: completo,
      diagnostico: calcularPercentualPilar("DIAGNOSTICO_E_CAPACITACAO"),
      solucao: calcularPercentualPilar("SOLUCAO_E_TRANSFORMACAO"),
      conexao: calcularPercentualPilar("CONEXAO_E_INTERACAO"),
    };
  });

  const eventosParticipacao = listaParticipacoes.map((p) => {
    const emp = mapaEmpresas.get(p.id_empresa);
    return {
      id: `part-${p.id_participacao}`,
      empresa: emp?.nome_empresa || `Empresa #${p.id_empresa}`,
      descricao: `Participação registrada (${p.status})`,
      quando: formatarDataRelativa(p.criado_em || p.data),
      timestamp: new Date(p.criado_em || p.data || 0).getTime(),
    };
  });

  const eventosInteracao = listaInteracoes.map((i) => {
    const emp = mapaEmpresas.get(i.id_empresa);
    return {
      id: `inter-${i.id_interacao}`,
      empresa: emp?.nome_empresa || `Empresa #${i.id_empresa}`,
      descricao: `Interação (${i.tipo}): ${i.resultado || "acompanhamento registrado"}`,
      quando: formatarDataRelativa(i.data),
      timestamp: new Date(i.data || 0).getTime(),
    };
  });

  const eventosEnvios = listaEnvios.map((env) => {
    const emp = mapaEmpresas.get(env.empresa_id);
    return {
      id: `envio-${env.id}`,
      empresa: emp?.nome_empresa || `Empresa #${env.empresa_id}`,
      descricao: `Envio de ${env.tipo_dado || "dados"} (${env.pilar})`,
      quando: formatarDataRelativa(env.created_at),
      timestamp: new Date(env.created_at || 0).getTime(),
    };
  });

  const atividades = [...eventosParticipacao, ...eventosInteracao, ...eventosEnvios]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 6)
    .map(({ id, empresa, descricao, quando }) => ({id, empresa, descricao, quando}));

  const insights = [];

  if (engajamentoPorSetor.length > 0) {
    const destaqueConexao = [...engajamentoPorSetor].sort((a, b) => b.conexao - a.conexao)[0];
    insights.push({
      variante: "oportunidade",
      tag: "Oportunidade",
      titulo: `Conexão lidera no setor ${destaqueConexao.setor}`,
      texto: `${destaqueConexao.conexao}% de adesão das empresas cadastradas neste segmento.`,
    });
  }

  insights.push({
    variante: "atencao",
    tag: "Atenção",
    titulo: `${empresasEmRisco} empresas sem interação há 30 dias`,
    texto:
      empresasEmRisco > 0
        ? "Recomenda-se priorizar contato ativo pelo time de relacionamento."
        : "Todas as empresas receberam acompanhamento recente.",
  });

  const totalDiagnosticos = listaEnvios.filter(
    (env) => env.pilar === "DIAGNOSTICO_E_CAPACITACAO"
  ).length;

  insights.push({
    variante: "tendencia",
    tag: "Tendência",
    titulo: `${totalDiagnosticos} diagnósticos/capacitações no Hub`,
    texto: `Engajamento médio atual consolidado em ${engajamentoMedio} pontos.`,
  });

  const horaAtual = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    indicadores: {
      totalEmpresas,
      engajamentoMedio,
      programasAtivos,
      empresasEmRisco,
    },
    engajamentoPorSetor,
    atividades,
    insights,
    resumoInsights: `Gerado a partir de ${totalEmpresas} empresas · hoje, ${horaAtual}`,
  };
}
