const PILARES = [
  { chave: "diagnostico", nome: "Diagnóstico", cor: "var(--azul)" },
  { chave: "solucao", nome: "Solução", cor: "var(--verde)" },
  { chave: "conexao", nome: "Conexão", cor: "var(--turquesa)" },
];

const ESCALA = [100, 75, 50, 25, 0];

export function GraficoPilares({ dados }) {
  return (
    <section className="card grafico">
      <div className="grafico-topo">
        <div>
          <h2>Engajamento por Pilar do Hub</h2>
          <p>Acompanhamento das metas de Diagnóstico, Solução e Conexão</p>
        </div>

        <div className="legenda">
          {PILARES.map((p) => (
            <span key={p.chave}>
              <i style={{ background: p.cor }} />
              {p.nome}
            </span>
          ))}
        </div>
      </div>

      <div className="grafico-corpo">
        <div className="eixo-y">
          {ESCALA.map((v) => (
            <span key={v}>{v}%</span>
          ))}
        </div>

        <div>
          <div className="plot">
            <div className="linhas">
              {ESCALA.map((v) => (
                <i key={v} />
              ))}
            </div>

            <div className="grupos">
              {dados.map((d) => (
                <div className="grupo" key={d.setor}>
                  {PILARES.map((p) => (
                    <span
                      key={p.chave}
                      className="barra"
                      style={{ height: `${d[p.chave]}%`, background: p.cor }}
                      title={`${p.nome}: ${d[p.chave]}%`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="rotulos">
            {dados.map((d) => (
              <span key={d.setor}>{d.setor}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
