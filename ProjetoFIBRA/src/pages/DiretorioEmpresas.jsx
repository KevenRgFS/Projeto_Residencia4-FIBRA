import { useEffect, useState } from "react";
import { Filtros } from "../components/Filtros";
import { Table } from "../components/Table";
import { cadastrarEmpresa, listarEmpresas } from "../services/baseDadosService";

export function DiretorioEmpresas() {
  const [empresas, setEmpresas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function atualizarEmpresas() {
    setCarregando(true);
    setErro("");
    try {
      const lista = await listarEmpresas();
      setEmpresas(lista);
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    let ativo = true;
    listarEmpresas()
      .then((lista) => {
        if (ativo) setEmpresas(lista);
      })
      .catch((error) => {
        if (ativo) setErro(error.message);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  async function enviarCadastro(evento) {
    evento.preventDefault();
    setSalvando(true);
    setErro("");
    setMensagem("");

    try {
      const empresa = await cadastrarEmpresa(nome);
      setEmpresas((atuais) => [...atuais, empresa].sort((a, b) => a.nome.localeCompare(b.nome)));
      setNome("");
      setCadastroAberto(false);
      setMensagem(`Empresa "${empresa.nome}" cadastrada com sucesso.`);
    } catch (error) {
      setErro(error.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <Filtros
        onAtualizar={atualizarEmpresas}
        onCadastrar={() => {
          setErro("");
          setMensagem("");
          setCadastroAberto(true);
        }}
      />
      {mensagem && <p className="empresa-feedback" role="status">{mensagem}</p>}
      {erro && <p className="empresa-feedback empresa-feedback-erro" role="alert">{erro}</p>}
      {cadastroAberto && (
        <form className="empresa-form" onSubmit={enviarCadastro}>
          <div>
            <h2>Cadastrar empresa</h2>
            <p>Informe o nome para salvar a empresa na base de dados.</p>
          </div>
          <label htmlFor="nomeEmpresa">Nome da empresa *</label>
          <input
            id="nomeEmpresa"
            name="nome"
            type="text"
            maxLength={160}
            autoFocus
            required
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
          />
          <div className="empresa-form-acoes">
            <button type="button" className="clear-button" onClick={() => setCadastroAberto(false)}>
              Cancelar
            </button>
            <button type="submit" className="primary-button" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar empresa"}
            </button>
          </div>
        </form>
      )}
      {carregando && <p className="empresa-feedback" role="status">Carregando empresas...</p>}
      <Table empresas={empresas} />
    </>
  );
}