import { useState } from "react";
import { AreaUpload } from "./AreaUpload";
import { validarArquivo } from "../../utils/arquivos";
import { enviarArquivoApi, requisitarApi } from "../../services/apiService";
import "./BaseDeDados.css";

const ABAS = [
  { id: "upload", rotulo: "Upload de planilha" },
  { id: "manual", rotulo: "Entrada manual" },
];

const EMPRESA_INICIAL = {
  name: "",
  legalName: "",
  cnpj: "",
  sector: "",
  size: "",
  organizationType: "",
  employeeCount: "",
};

export function BasedeDados() {
  const [aba, setAba] = useState("upload");
  const [empresa, setEmpresa] = useState(EMPRESA_INICIAL);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);

  async function importarPlanilhas(arquivos) {
    setAviso(null);
    for (const arquivo of arquivos) {
      const erro = validarArquivo(arquivo);
      if (erro) {
        setAviso({ tipo: "erro", texto: erro });
        continue;
      }

      setEnviando(true);
      try {
        const resultado = await enviarArquivoApi("/empresas/importacao", arquivo);
        setAviso({
          tipo: "ok",
          texto: `${arquivo.name}: ${resultado.imported} registros importados.`,
        });
      } catch (erroImportacao) {
        setAviso({ tipo: "erro", texto: `${arquivo.name}: ${erroImportacao.message}` });
      } finally {
        setEnviando(false);
      }
    }
  }

  async function cadastrarEmpresa(evento) {
    evento.preventDefault();
    setEnviando(true);
    setAviso(null);
    const dados = { ...empresa };
    for (const campo of ["legalName", "cnpj", "sector", "size", "organizationType"]) {
      if (!dados[campo]) delete dados[campo];
    }
    if (dados.employeeCount === "") delete dados.employeeCount;
    else dados.employeeCount = Number(dados.employeeCount);

    try {
      await requisitarApi("/empresas", { metodo: "POST", corpo: dados });
      setEmpresa(EMPRESA_INICIAL);
      setAviso({ tipo: "ok", texto: "Empresa cadastrada com sucesso." });
    } catch (erro) {
      setAviso({ tipo: "erro", texto: erro.message });
    } finally {
      setEnviando(false);
    }
  }

  function alterarEmpresa(campo, valor) {
    setEmpresa((atual) => ({ ...atual, [campo]: valor }));
  }

  return (
    <section className="base-dados">
      <div className="base-dados-card">
        <header className="base-dados-topo">
          <div>
            <h2>Alimentar a Base de Dados</h2>
            <p>Importe empresas por planilha ou cadastre os dados manualmente.</p>
          </div>
        </header>

        <div className="abas" role="tablist" aria-label="Forma de inserção">
          {ABAS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={aba === item.id}
              className={`aba ${aba === item.id ? "ativa" : ""}`}
              onClick={() => { setAba(item.id); setAviso(null); }}
            >
              {item.rotulo}
            </button>
          ))}
        </div>

        {aviso && <p className={`aviso-base-dados ${aviso.tipo}`} role="alert">{aviso.texto}</p>}

        {aba === "upload" ? (
          <div className="coluna-envio">
            <AreaUpload onArquivos={importarPlanilhas} desabilitado={enviando} />
            <p className="ajuda-base-dados">
              A planilha deve ter uma linha de cabeçalho com nome, CNPJ, setor e demais campos da empresa.
              São aceitos arquivos XLSX e CSV de até 5 MB.
            </p>
          </div>
        ) : (
          <form className="cadastro-manual" onSubmit={cadastrarEmpresa}>
            <label>
              Nome da empresa *
              <input required maxLength="160" value={empresa.name} onChange={(e) => alterarEmpresa("name", e.target.value)} />
            </label>
            <label>
              Razão social
              <input maxLength="200" value={empresa.legalName} onChange={(e) => alterarEmpresa("legalName", e.target.value)} />
            </label>
            <label>
              CNPJ (14 dígitos)
              <input inputMode="numeric" pattern="[0-9]{14}" maxLength="14" value={empresa.cnpj} onChange={(e) => alterarEmpresa("cnpj", e.target.value)} />
            </label>
            <label>
              Setor
              <input maxLength="100" value={empresa.sector} onChange={(e) => alterarEmpresa("sector", e.target.value)} />
            </label>
            <label>
              Porte
              <select value={empresa.size} onChange={(e) => alterarEmpresa("size", e.target.value)}>
                <option value="">Selecione</option>
                <option value="mei">MEI</option>
                <option value="micro">Micro</option>
                <option value="pequena">Pequena</option>
                <option value="media">Média</option>
                <option value="grande">Grande</option>
              </select>
            </label>
            <label>
              Tipo de organização
              <select value={empresa.organizationType} onChange={(e) => alterarEmpresa("organizationType", e.target.value)}>
                <option value="">Selecione</option>
                <option value="empresa">Empresa</option>
                <option value="startup">Startup</option>
                <option value="governo">Governo</option>
                <option value="academia">Academia</option>
                <option value="servicos">Serviços</option>
              </select>
            </label>
            <label>
              Número de funcionários
              <input type="number" min="0" step="1" value={empresa.employeeCount} onChange={(e) => alterarEmpresa("employeeCount", e.target.value)} />
            </label>
            <button type="submit" className="botao-primario" disabled={enviando}>
              {enviando ? "Salvando..." : "Cadastrar empresa"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
