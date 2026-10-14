import { Link } from "react-router-dom";

export function AtividadeRecente({ itens }) {
  return (
    <aside className="card atividade">
      <div className="atividade-topo">
        <h2>Atividade Recente</h2>
        <Link to="/empresas" className="link-azul">Ver tudo</Link>
      </div>

      <ul className="linha-tempo">
        {itens.map((item) => (
          <li key={item.empresa}>
            <strong>{item.empresa}</strong>
            <p>
              {item.descricao}
              {item.destaque && <> <span className="destaque">{item.destaque}</span></>}
            </p>
            <small>{item.quando}</small>
          </li>
        ))}
      </ul>
    </aside>
  );
}
