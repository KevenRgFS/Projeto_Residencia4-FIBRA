import { CardIndicador } from "./CardIndicador";
import { GraficoPilares } from "./GraficoPilares";
import { AtividadeRecente } from "./AtividadeRecente";
import { Insights } from "./Insights";
import "./PainelGeral.css";

const engajamentoPorSetor = [
  { setor: "Metalúrgico", diagnostico: 93, solucao: 62, conexao: 82 },
  { setor: "Alimentos", diagnostico: 66, solucao: 72, conexao: 52 },
  { setor: "Químico", diagnostico: 85, solucao: 65, conexao: 68 },
  { setor: "Têxtil", diagnostico: 80, solucao: 70, conexao: 91 },
  { setor: "Construção", diagnostico: 70, solucao: 80, conexao: 45 },
];

const atividades = [
  { empresa: "Metalúrgica São Paulo S.A.", descricao: "Enviou diagnóstico de maturidade", quando: "Hoje, 14:32" },
  { empresa: "Alimentos Cerrado Ltda.", descricao: "Aprovado no Programa Conexão Indústria", quando: "Ontem, 17:05" },
  { empresa: "Tecnologia Aeroespacial DF", descricao: "Mudança de pontuação de engajamento", destaque: "78 -> 92", quando: "Ontem, 11:15" },
  { empresa: "Calçados do Sul Eireli", descricao: "Iniciou fase de Solução", quando: "08 Nov, 09:30" },
  { empresa: "Indústria Têxtil Cerrado", descricao: "Registrou nova interação de acompanhamento", quando: "07 Nov, 16:40" },
  { empresa: "Cerâmica Planalto", descricao: "Adicionado ao programa Diagnóstico Digital", quando: "05 Nov, 14:00" },
];

const insights = [
  { variante: "oportunidade", tag: "Oportunidade", titulo: "Conexão é o pilar mais forte do Têxtil", texto: "91% de adesão no setor, contra 65% na média geral." },
  { variante: "atencao", tag: "Atenção", titulo: "38 empresas sem interação há 30 dias", texto: "Concentradas em Construção e Alimentos de pequeno porte." },
  { variante: "tendencia", tag: "Tendência", titulo: "Diagnósticos crescem 4,2% ao mês", texto: "Sustenta a alta do engajamento médio para 72,4 pontos." },
];

export function PainelGeral() {
  return (
    <div className="painel">
      <section className="indicadores">
        <CardIndicador
          titulo="Empresas Cadastradas"
          valor="847"
          extra={<span className="badge-verde">+4.2% este mês</span>}
        />
        <CardIndicador titulo="Engajamento Médio" valor="72.4" extra={<span className="barra-status verde" />} />
        <CardIndicador titulo="Programas Ativos" valor="12" extra={<span className="barra-status verde" />} />
        <CardIndicador titulo="Empresas em Risco" valor="38" extra={<span className="barra-status laranja" />} />
      </section>

      <div className="coluna-principal">
        <GraficoPilares dados={engajamentoPorSetor} />
        <Insights resumo="Gerado a partir de 847 empresas · hoje, 14:40" insights={insights} />
      </div>

      <AtividadeRecente itens={atividades} />
    </div>
  );
}