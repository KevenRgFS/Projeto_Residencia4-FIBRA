export function CardIndicador({ titulo, valor, extra }) {
  return (
    <article className="card indicador">
      <span className="indicador-titulo">{titulo}</span>
      <div className="indicador-linha">
        <strong>{valor}</strong>
        {extra}
      </div>
    </article>
  );
}
