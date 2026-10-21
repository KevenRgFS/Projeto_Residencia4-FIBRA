import { supabase } from "../lib/supabaseClient";

const TABELA = "envios";
const BUCKET = "base-de-dados";
const PAUSA_MS = 400;

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    .select("Id_empresa, Nome_Empresa")
    .order("Nome_Empresa", { ascending: true });

  if (error) throw new Error(`Não foi possível carregar as empresas: ${error.message}`);
  return data.map((linha) => ({ id: linha.Id_empresa, nome: linha.Nome_Empresa }));
}

export async function listarFila() {
  const { data, error } = await supabase
    .from(TABELA)
    .select("*")
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

  const { data, error } = await supabase
    .from(TABELA)
    .insert({
      nome: arquivo.name,
      tamanho_bytes: arquivo.size,
      detalhe: classificacao.nomeEmpresa || "sem empresa vinculada",
      status: "na_fila",
      progresso: 0,
      caminho_arquivo: caminho,
      empresa_id: classificacao.empresaId ? Number(classificacao.empresaId) : null,
      pilar: classificacao.pilar || null,
      tipo_dado: classificacao.tipoDado || null,
      periodo: classificacao.periodo || null,
      observacoes: classificacao.observacoes || null,
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from(BUCKET).remove([caminho]);
    throw new Error(`Falha ao registrar "${arquivo.name}": ${error.message}`);
  }

  return paraItem(data);
}

async function atualizarNoBanco(id, mudancas, aoAtualizar) {
  const { data, error } = await supabase
    .from(TABELA)
    .update(mudancas)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Falha ao atualizar o item: ${error.message}`);
  aoAtualizar?.(paraItem(data));
}

export async function processarItens(ids, aoAtualizar) {
  for (const id of ids) {
    await atualizarNoBanco(id, { status: "processando", progresso: 10 }, aoAtualizar);
    for (const progresso of [35, 65, 90]) {
      await esperar(PAUSA_MS);
      await atualizarNoBanco(id, { progresso }, aoAtualizar);
    }
    await esperar(PAUSA_MS);
    await atualizarNoBanco(id, { status: "indexado", progresso: 100 }, aoAtualizar);
  }
}

export async function limparFila() {
  const { data: remover, error: erroBusca } = await supabase
    .from(TABELA)
    .select("id, caminho_arquivo")
    .neq("status", "processando");
  if (erroBusca) throw new Error(`Não foi possível limpar a fila: ${erroBusca.message}`);

  if (remover.length > 0) {
    await supabase.storage.from(BUCKET).remove(remover.map((l) => l.caminho_arquivo));

    const { error } = await supabase
      .from(TABELA)
      .delete()
      .in("id", remover.map((l) => l.id));
    if (error) throw new Error(`Não foi possível limpar a fila: ${error.message}`);
  }

  return listarFila();
}