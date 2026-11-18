import { useState } from "react";

const STATUS = {
  ativo: { classe: "active", texto: "Ativo" },
  inativo: { classe: "inactive", texto: "Inativo" },
  risco: { classe: "risk-status", texto: "Em risco" },
};

const ITENS_POR_PAGINA = 10;

function classeDoScore(score) {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  if (score >= 40) return "low";
  return "risk";
}

function gerarPaginas(paginaAtual, totalPaginas) {
  if (totalPaginas <= 5) {
    return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  }

  if (paginaAtual <= 3) {
    return [1, 2, 3, 4, "...", totalPaginas];
  }

  if (paginaAtual >= totalPaginas - 2) {
    return [1, "...", totalPaginas - 3, totalPaginas - 2, totalPaginas - 1, totalPaginas];
  }

  return [1, "...", paginaAtual - 1, paginaAtual, paginaAtual + 1, "...", totalPaginas];
}

export function Table({ empresas }) {
  const [paginaAtual, setPaginaAtual] = useState(1);

  const totalPaginas = Math.max(1, Math.ceil(empresas.length / ITENS_POR_PAGINA));
  const paginaSegura = Math.min(paginaAtual, totalPaginas);

  const inicio = (paginaSegura - 1) * ITENS_POR_PAGINA;
  const fim = Math.min(inicio + ITENS_POR_PAGINA, empresas.length);
  const empresasPaginadas = empresas.slice(inicio, fim);

  const paginas = gerarPaginas(paginaSegura, totalPaginas);

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
          {empresasPaginadas.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: "center", padding: "1.5rem", color: "#64748b" }}>
                Nenhuma empresa encontrada com os filtros selecionados.
              </td>
            </tr>
          ) : (
            empresasPaginadas.map((e) => (
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
            ))
          )}
        </tbody>
      </table>

      <div className="table-footer">
        <span>
          {empresas.length === 0 ? (
            <>Exibindo <strong>0</strong> empresas</>
          ) : (
            <>
              Exibindo <strong>{inicio + 1}–{fim}</strong> de{" "}
              <strong>{empresas.length}</strong> empresas
            </>
          )}
        </span>

        <div className="pagination">
          <button
            type="button"
            disabled={paginaSegura === 1}
            onClick={() => setPaginaAtual(paginaSegura - 1)}
          >
            ‹
          </button>

          {paginas.map((item, idx) =>
            item === "..." ? (
              <span key={`sep-${idx}`} style={{ padding: "0 6px", color: "#64748b" }}>
                ...
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={paginaSegura === item ? "selected" : ""}
                onClick={() => setPaginaAtual(item)}
              >
                {item}
              </button>
            )
          )}

          <button
            type="button"
            disabled={paginaSegura === totalPaginas}
            onClick={() => setPaginaAtual(paginaSegura + 1)}
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
}
