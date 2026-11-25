import { supabase } from "../lib/supabaseClient";
import { gerarHashArquivo, validarPlanilha } from "../utils/validadorPlanilha";

const TABELA = "envios";
const BUCKET = "base-de-dados";

const PILARES_VALIDOS = new Set(
  Array.of(
    "DIAGNOSTICO_E_CAPACITACAO",
    "SOLUCAO_E_TRANSFORMACAO",
    "CONEXAO_E_INTERACAO"
  )
);

function mapearPilarTela(pilarSelecionado) {
  if (!pilarSelecionado) return "DIAGNOSTICO_E_CAPACITACAO";
  if (PILARES_VALIDOS.has(pilarSelecionado)) return pilarSelecionado;

  const norm = pilarSelecionado
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (norm.includes("solucao")) return "SOLUCAO_E_TRANSFORMACAO";
  if (norm.includes("conexao")) return "CONEXAO_E_INTERACAO";
  return "DIAGNOSTICO_E_CAPACITACAO";
}

function mapearTipoImportacao(tipoDado) {
  const norm = String(tipoDado ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (norm.includes("presenca") || norm.includes("evento")) return "presenca_evento";
  if (norm.includes("empresa") || norm.includes("cadastro") || norm.includes("lote")) {
    return "cadastro_empresas";
  }
  return "outro";
}

function classificarMotivoPendencia(textoMotivo) {
  const t = String(textoMotivo ?? "");
  if (t.includes("Caso 1:") || t.includes("Caso 2:") || t.includes("Caso 3:")) {
    return "cnpj_invalido";
  }
  if (t.includes("Caso 6:") || t.includes("Caso 7:") || t.includes("sem CNPJ")) {
    return "cnpj_ausente";
  }
  if (t.includes("Caso 8:")) return "empresa_nao_encontrada";
  if (t.includes("Caso 5:")) return "mesma_raiz_outra_filial";
  if (t.includes("Caso 4:")) return "nome_parecido";
  if (t.includes("Caso 9:") || t.includes("Caso 10:")) return "duplicada_na_planilha";
  if (t.includes("Caso 14:") || t.includes("vazio")) return "dados_incompletos";
  return "outro";
}


function paraItem(linha) {
  return {
    id: linha.id,
    nome: linha.nome,
    tamanhoBytes: linha.tamanho_bytes,
    detalhe: linha.detalhe ?? "",
    status: linha.status,
    progresso: linha.progresso,
  };
}

function nomeSeguro(nome) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function listarEmpresas() {
  const { data, error } = await supabase
    .from("empresa")
    .select("id_empresa, nome_empresa")
    .order("nome_empresa", { ascending: true });

  if (error) throw new Error(`Não foi possível carregar as empresas: ${error.message}`);
  return data.map((linha) => ({ id: linha.id_empresa, nome: linha.nome_empresa }));
}
export async function listarFila() {
  const { data, error } = await supabase
    .from(TABELA)
    .select("*")
    .not("nome", "like", "% - Linha %")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Não foi possível carregar a fila: ${error.message}`);
  return data.map(paraItem);
}


export async function enviarArquivo(arquivo, classificacao) {
  const caminho = `${crypto.randomUUID()}-${nomeSeguro(arquivo.name)}`;

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, arquivo);

  if (erroUpload) {
    throw new Error(`Falha ao enviar "${arquivo.name}": ${erroUpload.message}`);
  }

  const pilarMapeado = mapearPilarTela(classificacao?.pilar);
  const empresaId = classificacao?.empresaId ? Number(classificacao.empresaId) : null;

  const { data, error } = await supabase
    .from(TABELA)
    .insert({
      nome: arquivo.name,
      tamanho_bytes: arquivo.size,
      detalhe: "Aguardando processamento",
      status: "na_fila",
      progresso: 0,
      caminho_arquivo: caminho,
      empresa_id: empresaId,
      pilar: pilarMapeado,
      tipo_dado: classificacao?.tipoDado || "Cadastro em lote",
      periodo: classificacao?.periodo || "2026-Q4",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Falha ao registrar envio "${arquivo.name}": ${error.message}`);
  }

  return paraItem(data);
}
export async function processarItens(ids, onAtualizarItem) {
    const { data: empresasExistentes } = await supabase
      .from("empresa")
      .select("id_empresa, nome_empresa, cnpj");

  for (const id of ids) {
    const { data: envio, error: errBusca } = await supabase
      .from(TABELA)
      .select("*")
      .eq("id", id)
      .single();

    if (errBusca || !envio) continue;

    const { data: proc } = await supabase
      .from(TABELA)
      .update({ status: "processando", progresso: 25, detalhe: "Verificando integridade e hash..." })
      .eq("id", id)
      .select()
      .single();
    if (proc && onAtualizarItem) onAtualizarItem(paraItem(proc));

    try {
      const { data: blob, error: errDownload } = await supabase.storage
        .from(BUCKET)
        .download(envio.caminho_arquivo);

      if (errDownload) throw new Error(`Erro ao baixar arquivo: ${errDownload.message}`);

      const buffer = await blob.arrayBuffer();
      const hashArquivo = await gerarHashArquivo(buffer);

      // Caso 10: Planilha reenviada
      const { data: importacaoAnterior } = await supabase
        .from("importacao")
        .select("id_importacao, criado_em")
        .eq("hash_arquivo", hashArquivo)
        .limit(1)
        .maybeSingle();

      if (importacaoAnterior) {
        const { data: impRevisao, error: errRev } = await supabase
          .from("importacao")
          .insert({
            id_envio: envio.id,
            tipo: mapearTipoImportacao(envio.tipo_dado),
            status: "concluida_com_pendencias",
            hash_arquivo: hashArquivo,
            total_linhas: 0,
            linhas_ok: 0,
            linhas_pendentes: 1,
            linhas_erro: 0,
            finalizada_em: new Date().toISOString(),
          })
          .select("id_importacao")
          .single();

        if (errRev) throw new Error(`Erro ao registrar revisão: ${errRev.message}`);

        if (impRevisao) {
          await supabase.from("pendencia_importacao").insert({
            id_importacao: impRevisao.id_importacao,
            numero_linha: 1,
            motivo: "duplicada_na_planilha",
            dados: {
              tipo_registro: "REVISÃO HUMANA",
              descricao: "Caso 10: Planilha idêntica já enviada anteriormente — encaminhada para revisão humana.",
              nome_arquivo: envio.nome,
            },
          });
        }

        const { data: avisoReenvio } = await supabase
          .from(TABELA)
          .update({
            status: "erro",
            progresso: 100,
            detalhe: "Caso 10: Planilha reenviada detectada (hash idêntico) — enviada para revisão humana.",
          })
          .eq("id", id)
          .select()
          .single();

        if (avisoReenvio && onAtualizarItem) onAtualizarItem(paraItem(avisoReenvio));
        continue;
      }

      const resultado = validarPlanilha(buffer, {
        empresasExistentes: empresasExistentes || Array.of(),
        pilarPadrao: envio.pilar || "DIAGNOSTICO_E_CAPACITACAO",
        tipoDado: envio.tipo_dado || "",
      });

      // Caso 14: Estrutura quebrada
            if (resultado.statusArquivo === "rejeitado") {
        const { data: impRejeitada, error: errRej } = await supabase
          .from("importacao")
          .insert({
            id_envio: envio.id,
            tipo: mapearTipoImportacao(envio.tipo_dado),
            status: "falhou",
            hash_arquivo: hashArquivo,
            total_linhas: resultado.totalLinhas,
            linhas_ok: 0,
            linhas_pendentes: 0,
            linhas_erro: resultado.totalLinhas || 1,
            finalizada_em: new Date().toISOString(),
          })
          .select("id_importacao")
          .single();

        if (errRej) throw new Error(`Erro ao registrar falha: ${errRej.message}`);

        if (impRejeitada) {
          await supabase.from("pendencia_importacao").insert({
            id_importacao: impRejeitada.id_importacao,
            numero_linha: 1,
            motivo: "dados_incompletos",
            dados: {
              tipo_registro: "REJEITADA",
              descricao: resultado.motivoRejeicaoArquivo,
              nome_arquivo: envio.nome,
            },
          });
        }

        const { data: falhaEstrutural } = await supabase
          .from(TABELA)
          .update({
            status: "erro",
            progresso: 0,
            detalhe: resultado.motivoRejeicaoArquivo,
          })
          .eq("id", id)
          .select()
          .single();

        if (falhaEstrutural && onAtualizarItem) onAtualizarItem(paraItem(falhaEstrutural));
        continue;
      }

            const temPendenciasOuErros =
        resultado.linhasAviso.length > 0 || resultado.linhasRejeitadas.length > 0;
      const statusLote =
        resultado.linhasOk.length === 0 && resultado.linhasAviso.length === 0
          ? "falhou"
          : temPendenciasOuErros
          ? "concluida_com_pendencias"
          : "concluida";

      const { data: registroImportacao, error: errImp } = await supabase
        .from("importacao")
        .insert({
          id_envio: envio.id,
          tipo: mapearTipoImportacao(envio.tipo_dado),
          status: statusLote,
          hash_arquivo: hashArquivo,
          total_linhas: resultado.totalLinhas,
          linhas_ok: resultado.linhasOk.length,
          linhas_pendentes: resultado.linhasAviso.length,
          linhas_erro: resultado.linhasRejeitadas.length,
          finalizada_em: new Date().toISOString(),
        })
        .select("id_importacao")
        .single();

      if (errImp) throw new Error(`Erro ao registrar importação: ${errImp.message}`);

      const idImportacao = registroImportacao?.id_importacao;

      if (idImportacao) {
        const pendenciasParaSalvar = Array.of(
          ...resultado.linhasRejeitadas.map((rej) => ({
            id_importacao: idImportacao,
            numero_linha: rej.numeroLinha,
            motivo: classificarMotivoPendencia(rej.motivo),
            dados: {
              tipo_registro: "REJEITADA",
              descricao: rej.motivo,
              linha_original: rej.dados,
            },
            id_empresa_sugerida: rej.idEmpresaSugerida,
          })),
          ...resultado.linhasAviso.map((av) => {
            const textoAvisos = av.avisos.join(" | ");
            return {
              id_importacao: idImportacao,
              numero_linha: av.numeroLinha,
              motivo: classificarMotivoPendencia(textoAvisos),
              dados: {
                tipo_registro: "ACEITA COM AVISO",
                descricao: textoAvisos,
                linha_original: av.dadosOriginais,
              },
              id_empresa_sugerida: av.idEmpresaExistente,
            };
          })
        );

        if (pendenciasParaSalvar.length > 0) {
          const { error: errPend } = await supabase
            .from("pendencia_importacao")
            .insert(pendenciasParaSalvar);
          if (errPend) throw new Error(`Erro ao gravar pendências: ${errPend.message}`);
        }
      }

      const aceitas = Array.of(...resultado.linhasOk, ...resultado.linhasAviso);
      let gravadas = 0;

      for (const item of aceitas) {
        let idEmpresaFinal = item.idEmpresaExistente;

        if (idEmpresaFinal) {
          await supabase
            .from("empresa")
        .update({
          setor: item.empresa.setor,
          porte: item.empresa.porte,
          potencial: item.empresa.potencial,
          lideraca_feminina: item.empresa.lideraca_feminina,
        })
            .eq("id_empresa", idEmpresaFinal);
        } else {
          const { data: novaEmp, error: errIns } = await supabase
            .from("empresa")
            .insert(item.empresa)
            .select("id_empresa")
            .single();
          if (errIns) throw new Error(`Erro ao inserir ${item.empresa.nome_empresa}: ${errIns.message}`);
          idEmpresaFinal = novaEmp.id_empresa;
        }

        if (item.evento) {
          await supabase.from("participacao").insert({
            id_empresa: idEmpresaFinal,
            id_importacao: idImportacao || null,
            data: new Date().toISOString().split("T").at(0),
            status: "presente",
          });
        }

        if (gravadas === 0 && !envio.empresa_id) {
          await supabase
            .from(TABELA)
            .update({ empresa_id: idEmpresaFinal, pilar: item.pilar })
            .eq("id", id);
        } else {
          await supabase.from(TABELA).insert({
            nome: `${envio.nome} - Linha ${item.numeroLinha}`,
            tamanho_bytes: envio.tamanho_bytes,
            detalhe: item.avisos.length > 0 ? item.avisos.join(" | ") : "Importado sem avisos",
            status: "indexado",
            progresso: 100,
            caminho_arquivo: envio.caminho_arquivo,
            empresa_id: idEmpresaFinal,
            pilar: item.pilar,
            tipo_dado: envio.tipo_dado || "Importação em lote",
            periodo: envio.periodo || "2026-Q4",
          });
        }

        gravadas++;
      }

      const primeiroMotivoRejeicao = resultado.linhasRejeitadas.at(0)?.motivo;
      const resumo = Array.of(
        `${gravadas} aceita(s)`,
        resultado.linhasAviso.length > 0 ? `${resultado.linhasAviso.length} com aviso` : null,
        resultado.linhasRejeitadas.length > 0
          ? `${resultado.linhasRejeitadas.length} rejeitada(s): ${primeiroMotivoRejeicao}`
          : null
      )
        .filter(Boolean)
        .join(" · ");

      const statusFinal = gravadas === 0 && resultado.linhasRejeitadas.length > 0 ? "erro" : "indexado";

      const { data: concluido } = await supabase
        .from(TABELA)
        .update({
          status: statusFinal,
          progresso: 100,
          detalhe: resumo,
        })
        .eq("id", id)
        .select()
        .single();

      if (concluido && onAtualizarItem) onAtualizarItem(paraItem(concluido));
    } catch (err) {
      const { data: falha } = await supabase
        .from(TABELA)
        .update({ status: "erro", progresso: 0, detalhe: err.message })
        .eq("id", id)
        .select()
        .single();
      if (falha && onAtualizarItem) onAtualizarItem(paraItem(falha));
    }
  }
}

export async function limparFila() {
  const { error } = await supabase.from(TABELA).delete().in("status", Array.of("na_fila", "erro"));
  if (error) throw new Error(`Não foi possível limpar a fila: ${error.message}`);
  return listarFila();
}

export async function listarHistoricoImportacoes() {
  const { data, error } = await supabase
    .from("importacao")
    .select(`
      id_importacao,
      tipo,
      status,
      total_linhas,
      linhas_ok,
      linhas_pendentes,
      linhas_erro,
      criado_em,
      envios ( nome ),
      pendencia_importacao (
        id_pendencia,
        numero_linha,
        motivo,
        dados,
        resolvida_em
      )
    `)
    .order("criado_em", { ascending: false });

  if (error) throw new Error(`Erro ao carregar histórico: ${error.message}`);
  return data || [];
}

export async function resolverPendencia(idPendencia, idImportacao) {
  const agora = new Date().toISOString();

  const { error: errPend } = await supabase
    .from("pendencia_importacao")
    .update({ resolvida_em: agora })
    .eq("id_pendencia", idPendencia);

  if (errPend) {
    throw new Error(`Erro ao marcar pendência como resolvida: ${errPend.message}`);
  }

  const { count, error: errCount } = await supabase
    .from("pendencia_importacao")
    .select("*", { count: "exact", head: true })
    .eq("id_importacao", idImportacao)
    .is("resolvida_em", null);

  if (errCount) {
    throw new Error(`Erro ao verificar pendências restantes: ${errCount.message}`);
  }

  const loteConcluido = count === 0;
  if (loteConcluido) {
    const { error: errImp } = await supabase
      .from("importacao")
      .update({
        status: "concluida",
        finalizada_em: agora,
      })
      .eq("id_importacao", idImportacao);

    if (errImp) {
      throw new Error(`Erro ao concluir o lote de importação: ${errImp.message}`);
    }
  }

  return { loteConcluido };
}

