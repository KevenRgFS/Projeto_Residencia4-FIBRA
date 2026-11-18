const SETORES = [
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

const PORTES = [
  "Microempreendedor",
  "Microempresa",
  "Pequeno porte",
  "Medio porte",
  "Grande porte",
];

const PILARES = [
  { valor: "DIAGNOSTICO_E_CAPACITACAO", rotulo: "Diagnóstico e Capacitação" },
  { valor: "SOLUCAO_E_TRANSFORMACAO", rotulo: "Solução e Transformação" },
  { valor: "CONEXAO_E_INTERACAO", rotulo: "Conexão e Interação" },
];

const estiloSelectSetor = {
  maxWidth: "180px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const estiloGrupoBotoes = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginLeft: "auto",
  flexShrink: 0,
};

const estiloBotao = {
  whiteSpace: "nowrap",
};

export function Filtros({ filtros, onChangeFiltro, onLimpar, onAtualizar }) {
  return (
    <section className="filters">
      <select
        style={estiloSelectSetor}
        value={filtros.setor}
        onChange={(e) => onChangeFiltro("setor", e.target.value)}
        title={filtros.setor || "Setor: Todos"}
      >
        <option value="">Setor: Todos</option>
        {SETORES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={filtros.porte}
        onChange={(e) => onChangeFiltro("porte", e.target.value)}
      >
        <option value="">Porte: Todos</option>
        {PORTES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <select
        value={filtros.pilar}
        onChange={(e) => onChangeFiltro("pilar", e.target.value)}
      >
        <option value="">Pilar: Todos</option>
        {PILARES.map((p) => (
          <option key={p.valor} value={p.valor}>
            {p.rotulo}
          </option>
        ))}
      </select>

      <div className="score-filter" style={{ whiteSpace: "nowrap" }}>
        <span>Score:</span>
        <strong>{filtros.scoreMin} - 100</strong>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={filtros.scoreMin}
          onChange={(e) => onChangeFiltro("scoreMin", Number(e.target.value))}
          style={{ width: "75px", cursor: "pointer" }}
        />
      </div>

      <div style={estiloGrupoBotoes}>
        <button
          type="button"
          className="clear-button"
          style={estiloBotao}
          onClick={onAtualizar}
        >
          Atualizar Empresas
        </button>

        <button
          type="button"
          className="clear-button"
          style={estiloBotao}
          onClick={onLimpar}
        >
          Limpar Filtros
        </button>
      </div>
    </section>
  );
}
