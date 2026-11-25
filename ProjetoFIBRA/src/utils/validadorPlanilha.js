import * as XLSX from "xlsx";

const REGEX_MASCARA_CNPJ = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

const TIPOS_EMPRESA_OFICIAIS = new Set(
  Array.of("Industria", "Servico", "Comercio", "Startup", "Governo", "Academia", "Outros")
);


const SETORES_OFICIAIS = [
  "Construção Civil",
  "Industria da Informação",
  "Artefatos, Cimentos, Concretos e Mármores",
  "Madeira e Mobiliário",
  "Alimentação de Brasília",
  "Fabricação de Produtos Alimentares de Origem Vegetal",
  "Vestuário",
  "Fabricação/Reparação de Máquinas Industriais e Elétricas",
  "Indústrias Gráficas",
  "Metalúrgicas, Mecânicas e de Material Elétrico",
  "Outros",
];

const TIPOS_EVENTO_OFICIAIS = new Set([
  "capacitacao",
  "consultoria",
  "evento",
  "missao",
  "workshop",
  "conferencia",
  "evento_maior",
  "lancamento_programa",
  "encerramento_programa",
  "meetup",
  "programa_aceleracao",
  "outro",
]);

function normalizarChave(texto) {
  return String(texto ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_");
}

export function validarDigitosCNPJ(cnpjLimpo) {
  if (!cnpjLimpo || cnpjLimpo.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpjLimpo)) return false;

  const calcularDigito = (base, pesos) => {
    const soma = base
      .split("")
      .reduce((acc, num, idx) => acc + Number(num) * pesos[idx], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const pesos1 = Array.of(5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2);
  const pesos2 = Array.of(6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2);

  const base12 = cnpjLimpo.slice(0, 12);
  const dig1 = calcularDigito(base12, pesos1);
  const dig2 = calcularDigito(base12 + dig1, pesos2);

  return cnpjLimpo === `${base12}${dig1}${dig2}`;
}

function normalizarPorte(porteBruto) {
  const original = String(porteBruto ?? "").trim();
  if (!original) {
    return { valor: "Pequeno porte", aviso: "Porte vazio; assumido 'Pequeno porte'." };
  }

  const norm = original
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

  const MAPA_EXATO = {
    MICROEMPREENDEDOR: "Microempreendedor",
    MICROEMPRESA: "Microempresa",
    "PEQUENO PORTE": "Pequeno porte",
    "MEDIO PORTE": "Medio porte",
    "GRANDE PORTE": "Grande porte",
  };

  if (MAPA_EXATO[norm]) return { valor: MAPA_EXATO[norm], aviso: null };

  if (["MEI", "MICROEMPREENDEDOR INDIVIDUAL"].includes(norm)) {
    return { valor: "Microempreendedor", aviso: `Porte "${original}" padronizado para Microempreendedor.` };
  }
  if (["ME", "MICRO EMPRESA", "MICRO-EMPRESA"].includes(norm)) {
    return { valor: "Microempresa", aviso: `Porte "${original}" padronizado para Microempresa.` };
  }
  if (["EPP", "PEQUENA", "PEQUENA EMPRESA", "PEQUENO"].includes(norm)) {
    return { valor: "Pequeno porte", aviso: `Porte "${original}" padronizado para Pequeno porte.` };
  }
  if (["MEDIO", "MEDIA", "MEDIA EMPRESA"].includes(norm)) {
    return { valor: "Medio porte", aviso: `Porte "${original}" padronizado para Medio porte.` };
  }
  if (["GRANDE", "GRANDE EMPRESA"].includes(norm)) {
    return { valor: "Grande porte", aviso: `Porte "${original}" padronizado para Grande porte.` };
  }
  if (["DEMAIS", "DEMIAS"].includes(norm)) {
    return {
      valor: "Medio porte",
      aviso: `Porte "${original}" não distingue média de grande empresa; classificado como Medio porte para revisão.`,
    };
  }

  return { valor: "Outros", aviso: `Grafia de porte "${original}" fora do padrão; requer confirmação.` };
}

function normalizarTipoEvento(tipoBruto) {
  const original = String(tipoBruto ?? "").trim();
  if (!original) return { valor: "evento", aviso: null };

  const norm = normalizarChave(original);
  if (TIPOS_EVENTO_OFICIAIS.has(norm)) return { valor: norm, aviso: null };

  return {
    valor: "outro",
    aviso: `Tipo de evento "${original}" fora da lista oficial; registrado como "outro" para confirmação.`,
  };
}

function normalizarSetor(setorBruto) {
  const original = String(setorBruto ?? "").trim();
  if (!original) return { valor: "Outros", aviso: "Setor não informado; classificado como Outros." };

  const encontrado = SETORES_OFICIAIS.find(
    (s) => normalizarChave(s) === normalizarChave(original)
  );
  if (encontrado) return { valor: encontrado, aviso: null };

  return {
    valor: "Outros",
    aviso: `Setor "${original}" não consta no catálogo oficial; classificado como Outros.`,
  };
}

function interpretarBooleano(valor) {
  if (typeof valor === "boolean") return valor;
  const texto = String(valor ?? "").trim().toLowerCase();
  return ["sim", "s", "true", "1", "verdadeiro", "yes"].includes(texto);
}

export async function gerarHashArquivo(arrayBuffer) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
export function validarPlanilha(arrayBuffer, contextoBanco) {
  const { empresasExistentes, pilarPadrao, tipoDado } = contextoBanco;

  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const nomeAba = workbook.SheetNames[0];
  const sheet = workbook.Sheets[nomeAba];
  const matriz = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (!matriz || matriz.length < 2) {
    return {
      statusArquivo: "rejeitado",
      motivoRejeicaoArquivo: "Arquivo vazio ou sem linhas de dados.",
      avisosArquivo: [],
      linhasOk: [],
      linhasAviso: [],
      linhasRejeitadas: [],
      totalLinhas: 0,
    };
  }

  const cabecalhoBruto = matriz[0].map((col) => String(col ?? ""));
  const avisosArquivo = [];
  const colunasVistas = new Map();
  const colunasDuplicadas = [];

  cabecalhoBruto.forEach((colOriginal, idx) => {
    if (!colOriginal.trim()) return;

    if (colOriginal !== colOriginal.trim()) {
      avisosArquivo.push(
        `Caso 13: Cabeçalho "${colOriginal}" tinha espaços extras nas pontas (ignorados automaticamente).`
      );
    }

    const chaveNorm = normalizarChave(colOriginal);
    if (colunasVistas.has(chaveNorm)) {
      colunasDuplicadas.push(colOriginal.trim());
    } else {
      colunasVistas.set(chaveNorm, idx);
    }
  });

  if (colunasDuplicadas.length > 0) {
    return {
      statusArquivo: "rejeitado",
      motivoRejeicaoArquivo: `Caso 14 (Estrutura quebrada): Coluna(s) duplicada(s) encontrada(s): ${colunasDuplicadas.join(", ")}.`,
      avisosArquivo,
      linhasOk: [],
      linhasAviso: [],
      linhasRejeitadas: [],
      totalLinhas: matriz.length - 1,
    };
  }

  const temColunaCnpj = colunasVistas.has("cnpj");
  const temColunaNome =
    colunasVistas.has("nome_empresa") ||
    colunasVistas.has("nome") ||
    colunasVistas.has("razao_social") ||
    colunasVistas.has("razao_empresa") ||
    colunasVistas.has("empresa");

  if (!temColunaCnpj || !temColunaNome) {
    const faltando = [];
    if (!temColunaCnpj) faltando.push("CNPJ");
    if (!temColunaNome) faltando.push("Nome/Razão Social da Empresa");
    return {
      statusArquivo: "rejeitado",
      motivoRejeicaoArquivo: `Caso 14 (Estrutura quebrada): Coluna(s) obrigatória(s) faltando: ${faltando.join(", ")}.`,
      avisosArquivo,
      linhasOk: [],
      linhasAviso: [],
      linhasRejeitadas: [],
      totalLinhas: matriz.length - 1,
    };
  }

  const mapaPorCnpj = new Map();
  const mapaPorRaiz = new Map();
  const mapaPorNomeNorm = new Map();

  empresasExistentes.forEach((emp) => {
    const cnpjLimpo = String(emp.cnpj ?? "").replace(/\D/g, "");
    if (cnpjLimpo) {
      mapaPorCnpj.set(cnpjLimpo, emp);
      const raiz = cnpjLimpo.slice(0, 8);
      if (!mapaPorRaiz.has(raiz)) mapaPorRaiz.set(raiz, []);
      mapaPorRaiz.get(raiz).push(emp);
    }
    const nomeNorm = normalizarChave(emp.nome_empresa);
    if (!mapaPorNomeNorm.has(nomeNorm)) mapaPorNomeNorm.set(nomeNorm, []);
    mapaPorNomeNorm.get(nomeNorm).push(emp);
  });

  const presencasNoArquivo = new Set();
  const linhasOk = [];
  const linhasAviso = [];
  const linhasRejeitadas = [];

  const ehPlanilhaPresenca =
    normalizarChave(tipoDado).includes("presenca") ||
    colunasVistas.has("evento") ||
    colunasVistas.has("participante");

  for (let r = 1; r < matriz.length; r++) {
    const row = matriz[r];
    if (!row || row.every((cell) => String(cell ?? "").trim() === "")) continue;

    const numeroLinha = r + 1;
    const objLinha = {};
    colunasVistas.forEach((colIdx, chave) => {
      objLinha[chave] = String(row[colIdx] ?? "").trim();
    });

    const cnpjBruto = objLinha.cnpj || "";
    const nomeBruto =
      objLinha.nome_empresa ||
      objLinha.razao_social ||
      objLinha.razao_empresa ||
      objLinha.nome ||
      objLinha.empresa ||
      "";
    const nomeEvento = objLinha.evento || objLinha.programa || "";
    const participante = objLinha.participante || objLinha.contato || objLinha.cpf || "";

    if (!cnpjBruto) {
      const correspondencias = mapaPorNomeNorm.get(normalizarChave(nomeBruto)) || [];
      let motivoSemCnpj = "Caso 8: Linha sem CNPJ e empresa não existe no cadastro (planilha não cria empresa sem CNPJ).";

      if (correspondencias.length === 1) {
        motivoSemCnpj = `Caso 6: Presença/registro sem CNPJ (nome "${nomeBruto}" casa com 1 empresa, mas vincular só por nome é arriscado).`;
      } else if (correspondencias.length > 1) {
        motivoSemCnpj = `Caso 7: Presença/registro sem CNPJ e nome "${nomeBruto}" casa com ${correspondencias.length} empresas diferentes.`;
      }

      linhasRejeitadas.push({
        numeroLinha,
        motivo: motivoSemCnpj,
        dados: objLinha,
        idEmpresaSugerida: correspondencias.length === 1 ? correspondencias[0]?.id_empresa : null,
      });
      continue;
    }

    const cnpjLimpo = cnpjBruto.replace(/\D/g, "");

    if (cnpjLimpo.length !== 14) {
      linhasRejeitadas.push({
        numeroLinha,
        motivo: `Caso 2: CNPJ quebrado/incompleto (recebido: "${cnpjBruto}" — possui ${cnpjLimpo.length} dígitos, esperado 14).`,
        dados: objLinha,
        idEmpresaSugerida: null,
      });
      continue;
    }

    if (!REGEX_MASCARA_CNPJ.test(cnpjBruto)) {
      linhasRejeitadas.push({
        numeroLinha,
        motivo: `Caso 1: CNPJ fora do formato padrão XX.XXX.XXX/XXXX-XX (recebido: "${cnpjBruto}").`,
        dados: objLinha,
        idEmpresaSugerida: mapaPorCnpj.get(cnpjLimpo)?.id_empresa || null,
      });
      continue;
    }

    if (!validarDigitosCNPJ(cnpjLimpo)) {
      linhasRejeitadas.push({
        numeroLinha,
        motivo: `Caso 3: CNPJ com dígito verificador inválido (recebido: "${cnpjBruto}").`,
        dados: objLinha,
        idEmpresaSugerida: null,
      });
      continue;
    }

    const empresaCadastrada = mapaPorCnpj.get(cnpjLimpo);
    if (ehPlanilhaPresenca && !empresaCadastrada && !nomeBruto) {
      linhasRejeitadas.push({
        numeroLinha,
        motivo: `Caso 8: CNPJ ${cnpjBruto} não encontrado no cadastro para registro de presença.`,
        dados: objLinha,
        idEmpresaSugerida: null,
      });
      continue;
    }

    const avisosLinha = [...avisosArquivo];
    const raizCnpj = cnpjLimpo.slice(0, 8);

    let nomeFinal = nomeBruto || empresaCadastrada?.nome_empresa || "Empresa sem nome";
    if (
      empresaCadastrada &&
      nomeBruto &&
      empresaCadastrada.nome_empresa.trim() !== nomeBruto.trim()
    ) {
      avisosLinha.push(
        `Caso 4: Mesmo CNPJ com nome diferente ("${nomeBruto}"). Mantido o nome cadastrado: "${empresaCadastrada.nome_empresa}".`
      );
      nomeFinal = empresaCadastrada.nome_empresa;
    }

    const empresasMesmaRaiz = mapaPorRaiz.get(raizCnpj) || [];
    const outraFilial = empresasMesmaRaiz.find((e) => e.cnpj !== cnpjLimpo);
    if (!empresaCadastrada && outraFilial) {
      avisosLinha.push(
        `Caso 5: Filial detectada (raiz ${raizCnpj} já vinculada a "${outraFilial.nome_empresa}"). Ligada ao mesmo grupo sem juntar cadastros.`
      );
    }

    if (nomeEvento) {
      const chaveEventoEmpresa = `${cnpjLimpo}::${normalizarChave(nomeEvento)}`;
      if (presencasNoArquivo.has(chaveEventoEmpresa)) {
        avisosLinha.push(
          `Caso 9: Empresa repetida no evento "${nomeEvento}" (presença contabilizada por pessoa${participante ? `: ${participante}` : ""}).`
        );
      }
      presencasNoArquivo.add(chaveEventoEmpresa);
    }

    let tipoEventoFinal = "evento";
    if (nomeEvento || objLinha.tipo_evento) {
      const { valor, aviso } = normalizarTipoEvento(objLinha.tipo_evento || objLinha.tipo);
      tipoEventoFinal = valor;
      if (aviso) avisosLinha.push(`Caso 11: ${aviso}`);
    }

    const { valor: porteFinal, aviso: avisoPorte } = normalizarPorte(objLinha.porte);
    if (avisoPorte) avisosLinha.push(`Caso 12: ${avisoPorte}`);

    const { valor: setorFinal, aviso: avisoSetor } = normalizarSetor(objLinha.setor);
    if (avisoSetor) avisosLinha.push(avisoSetor);

    const registroValidado = {
      numeroLinha,
      idEmpresaExistente: empresaCadastrada?.id_empresa || null,
        
      empresa: {
        id_hubspot: objLinha.id_hubspot ? Number(objLinha.id_hubspot) : null,
        nome_empresa: nomeFinal,
        razao_empresa: objLinha.razao_empresa || objLinha.razao_social || nomeFinal,
        cnpj: cnpjLimpo.slice(0, 14),
        cnae: (objLinha.cnae || "").slice(0, 10) || null,
        cnae_descricao: objLinha.cnae_descricao || null,
        telefone: (objLinha.telefone || "").slice(0, 20) || null,
        email: (objLinha.email || "").slice(0, 254) || null,
        responsavel: (objLinha.responsavel || "").slice(0, 120) || null,
        sindicato: (objLinha.sindicato || "").slice(0, 120) || null,
        num_funcionarios: objLinha.num_funcionarios ? Number(objLinha.num_funcionarios) : null,
        situacao_cadastral: (objLinha.situacao_cadastral || "Ativa").slice(0, 30),
        porte: porteFinal,
        tipo: TIPOS_EMPRESA_OFICIAIS.has(objLinha.tipo) ? objLinha.tipo : "Industria",
        potencial: (objLinha.potencial || "medio").slice(0, 10),
        lideraca_feminina: interpretarBooleano(
          objLinha.lideranca_feminina || objLinha.lideraca_feminina
        ),
        setor: setorFinal,
      },

      evento: nomeEvento
        ? {
            nome: nomeEvento,
            tipo: tipoEventoFinal,
            pilar: pilarPadrao,
          }
        : null,
      pilar: pilarPadrao,
      avisos: avisosLinha,
      dadosOriginais: objLinha,
    };

    if (avisosLinha.length > 0) {
      linhasAviso.push(registroValidado);
    } else {
      linhasOk.push(registroValidado);
    }
  }

  return {
    statusArquivo: "validado",
    motivoRejeicaoArquivo: null,
    avisosArquivo,
    linhasOk,
    linhasAviso,
    linhasRejeitadas,
    totalLinhas: linhasOk.length + linhasAviso.length + linhasRejeitadas.length,
  };
}
