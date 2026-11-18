import { useEffect, useState } from "react";
import { Filtros } from "../components/Filtros";
import { Table } from "../components/Table";
import { carregarDiretorioEmpresas } from "../services/empresasService";

const FILTROS_INICIAIS = {
  setor: "",
  porte: "",
  pilar: "",
  scoreMin: 0,
};

export function DiretorioEmpresas() {
  const [empresas, setEmpresas] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ativo = true;

    carregarDiretorioEmpresas()
      .then((dados) => {
        if (ativo) {
          setEmpresas(dados);
          setErro(null);
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar empresas:", err);
        if (ativo) {
          setErro("Não foi possível carregar o diretório de empresas.");
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  async function atualizarEmpresas() {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await carregarDiretorioEmpresas();
      setEmpresas(dados);
    } catch (err) {
      console.error("Erro ao atualizar empresas:", err);
      setErro("Não foi possível carregar o diretório de empresas.");
    } finally {
      setCarregando(false);
    }
  }

  function mudarFiltro(campo, valor) {
    setFiltros((atual) => ({ ...atual, [campo]: valor }));
  }

  function limparFiltros() {
    setFiltros(FILTROS_INICIAIS);
  }

  const empresasFiltradas = empresas.filter((emp) => {
    if (filtros.setor && emp.setor !== filtros.setor) return false;
    if (filtros.porte && emp.porte !== filtros.porte) return false;
    if (filtros.pilar && !emp.pilares.includes(filtros.pilar)) return false;
    if (emp.score < filtros.scoreMin) return false;
    return true;
  });

  return (
    <>
      <Filtros
        filtros={filtros}
        onChangeFiltro={mudarFiltro}
        onLimpar={limparFiltros}
        onAtualizar={atualizarEmpresas}
      />
      {erro && <p style={{ color: "red", padding: "1rem" }}>{erro}</p>}
      {carregando ? (
        <p style={{ padding: "1rem" }}>Carregando empresas...</p>
      ) : (
        <Table empresas={empresasFiltradas} />
      )}
    </>
  );
}
