const STATUS = {
  ativo: { classe: "active", texto: "Ativo" },
  inativo: { classe: "inactive", texto: "Inativo" },
  risco: { classe: "risk-status", texto: "Em risco" },
};

function classeDoScore(score) {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  if (score >= 40) return "low";
  return "risk";
}

export function Table({ empresas }) {
  return (
    <section className="table-container">
      <table>
        <thead>
          <tr>
            <th>Razão Social</th>
            <th>Setor</th>
            <th>Porte</th>
            <th>Score Hub</th>
            <th>Última Interação</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {empresas.map((e) => (
            <tr key={e.id}>
              <td>{e.nome}</td>
              <td>{e.setor}</td>
              <td>{e.porte}</td>
              <td>
                <span className={`score ${classeDoScore(e.score)}`}>{e.score}</span>
              </td>
              <td>{e.ultimaInteracao}</td>
              <td>
                <span className={`status ${STATUS[e.status].classe}`}>
                  {STATUS[e.status].texto}
                </span>
              </td>
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="table-footer">
        <span>
          Exibindo <strong>{empresas.length}</strong> empresas
        </span>

        <div className="pagination">
          <button>‹</button>
          <button className="selected">1</button>
          <button>›</button>
        </div>
      </div>
    </section>
  );
}
