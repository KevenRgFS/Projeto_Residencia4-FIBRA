import { useEffect, useState } from "react";
import { CardIndicador } from "./CardIndicador";
import { GraficoPilares } from "./GraficoPilares";
import { AtividadeRecente } from "./AtividadeRecente";
import { Insights } from "./Insights";
import { carregarDadosPainel } from "../../services/painelService";
import "./PainelGeral.css";

export function PainelGeral() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    async function buscarDados() {
      try {
        setCarregando(true);
        const resultado = await carregarDadosPainel();
        setDados(resultado);
      } catch (err) {
        console.error("Erro ao carregar painel:", err);
        setErro("Não foi possível carregar os dados do Supabase.");
      } finally {
        setCarregando(false);
      }
    }

    buscarDados();
  }, []);

  if (carregando) {
    return <div className="painel"><p>Carregando indicadores do Hub...</p></div>;
  }

  if (erro || !dados) {
    return <div className="painel"><p>{erro || "Nenhum dado disponível."}</p></div>;
  }

  const { indicadores, engajamentoPorSetor, atividades, insights, resumoInsights } = dados;

  return (
    <div className="painel">
      <section className="indicadores">
        <CardIndicador
          titulo="Empresas Cadastradas"
          valor={String(indicadores.totalEmpresas)}
          extra={<span className="badge-verde">Base ativa</span>}
        />
        <CardIndicador
          titulo="Engajamento Médio"
          valor={String(indicadores.engajamentoMedio)}
          extra={<span className="barra-status verde" />}
        />
        <CardIndicador
          titulo="Programas Ativos"
          valor={String(indicadores.programasAtivos)}
          extra={<span className="barra-status verde" />}
        />
        <CardIndicador
          titulo="Empresas em Risco"
          valor={String(indicadores.empresasEmRisco)}
          extra={
            <span
              className={`barra-status ${indicadores.empresasEmRisco > 0 ? "laranja" : "verde"}`}
            />
          }
        />
      </section>

      <div className="coluna-principal">
        <GraficoPilares dados={engajamentoPorSetor} />
        <Insights resumo={resumoInsights} insights={insights} />
      </div>

      <AtividadeRecente itens={atividades} />
    </div>
  );
}
