export function Insights({ resumo, insights }) {
  return (
    <section className="card insights">
      <div className="insights-topo">
        <h2>Insights</h2>
        <span className="pill">{resumo}</span>
        <button type="button" className="link-azul">Ver todos os insights</button>
      </div>

      <div className="insights-grid">
        {insights.map((i) => (
          <article key={i.titulo} className={`insight ${i.variante}`}>
            <span className="insight-tag">{i.tag}</span>
            <strong>{i.titulo}</strong>
            <p>{i.texto}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
