import { useEffect, useState } from "react";
import { AreaUpload } from "./AreaUpload";
import { ClassificacaoEnvio } from "./ClassificacaoEnvio";
import { FilaProcessamento } from "./FilaProcessamento";
import { classificacaoInicial } from "../../data/baseDeDados";
import { validarArquivo } from "../../utils/arquivos";
import {
  listarFila,
  listarEmpresas,
  enviarArquivo,
  processarItens,
  limparFila,
} from "../../services/baseDadosService";
import "./BaseDeDados.css";

const ABAS = [
  { id: "upload", rotulo: "Upload de arquivos" },
  { id: "manual", rotulo: "Entrada manual" },
  { id: "externa", rotulo: "Conectar fonte externa" },
];

export function BaseDeDados() {
  const [aba, setAba] = useState("upload");
  const [classificacao, setClassificacao] = useState(classificacaoInicial);
  const [fila, setFila] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [erros, setErros] = useState([]);

  // Ao abrir a página, busca a fila no serviço (hoje: dados de exemplo).
  useEffect(() => {
    let ativo = true;
    listarFila()
      .then((itens) => {
        if (ativo) setFila(itens);
      })
      .catch((e) => {
        if (ativo) setErros([e.message]);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => { ativo = false; };
  }, []);

  // Busca as empresas para o campo "Empresa vinculada".
  useEffect(() => {
    let ativo = true;
    listarEmpresas()
      .then((lista) => {
        if (ativo) setEmpresas(lista);
      })
      .catch((e) => {
        if (ativo) setErros((atual) => [...atual, e.message]);
      });
    return () => { ativo = false; };
  }, []);

  // Itens que ainda vão ser processados (novos ou que deram erro).
  const pendentes = fila.filter((i) => i.status === "na_fila" || i.status === "erro");

  function mudarClassificacao(campo, valor) {
    setClassificacao((atual) => ({ ...atual, [campo]: valor }));
  }

  // Troca um item da fila pela versão atualizada.
  function atualizarItem(itemNovo) {
    setFila((atual) => atual.map((i) => (i.id === itemNovo.id ? itemNovo : i)));
  }

  async function receberArquivos(arquivos) {
    const mensagens = [];
    const validos = [];

    arquivos.forEach((arquivo) => {
      const erro = validarArquivo(arquivo);
      if (erro) mensagens.push(erro);
      else validos.push(arquivo);
    });
    setErros(mensagens);

    const nomeEmpresa = empresas.find((e) => String(e.id) === classificacao.empresaId)?.nome;
    for (const arquivo of validos) {
      try {
        const item = await enviarArquivo(arquivo, { ...classificacao, nomeEmpresa });
        setFila((atual) => [...atual, item]);
      } catch (e) {
        mensagens.push(e.message);
        setErros([...mensagens]);
      }
    }
  }

  async function processar() {
    setProcessando(true);
    setErros([]);
    try {
      await processarItens(pendentes.map((i) => i.id), atualizarItem);
    } catch (e) {
      setErros([e.message]);
    } finally {
      setProcessando(false);
    }
  }

  async function limpar() {
    try {
      setFila(await limparFila());
    } catch (e) {
      setErros([e.message]);
    }
  }

  const qtd = pendentes.length;

  return (
    <section className="base-dados">
      <div className="base-dados-card">
        <header className="base-dados-topo">
          <div>
            <h2>Alimentar a Base de Dados</h2>
            <p>Envie documentos, planilhas ou registros manuais para gerar diagnósticos e recomendações do Hub.</p>
          </div>

          <div className="base-dados-acoes">
            {/* TODO: abrir a tela/modal de histórico de envios */}
            <button type="button" className="botao-contorno">Ver histórico</button>
            <button
              type="button"
              className="botao-primario"
              disabled={qtd === 0 || processando}
              onClick={processar}
            >
              Processar {qtd} {qtd === 1 ? "item" : "itens"}
            </button>
          </div>
        </header>

        <div className="abas">
          {ABAS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`aba ${aba === item.id ? "ativa" : ""}`}
              onClick={() => setAba(item.id)}
            >
              {item.rotulo}
            </button>
          ))}
        </div>

        <div className="base-dados-corpo">
          {aba === "upload" ? (
            <div className="coluna-envio">
              <AreaUpload onArquivos={receberArquivos} desabilitado={processando} />

              {erros.length > 0 && (
                <ul className="erros-upload">
                  {erros.map((erro) => <li key={erro}>{erro}</li>)}
                </ul>
              )}

              <ClassificacaoEnvio empresas={empresas} valores={classificacao} onChange={mudarClassificacao} />
            </div>
          ) : (
            <div className="coluna-envio aba-vazia">
              Esta aba ainda será construída.
            </div>
          )}

          <FilaProcessamento itens={fila} carregando={carregando} onLimpar={limpar} />
        </div>
      </div>
    </section>
  );
}
