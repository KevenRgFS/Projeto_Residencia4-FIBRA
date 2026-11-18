import { ItemFila } from "./ItemFila";

export function FilaProcessamento({ itens, carregando, onLimpar }) {
  return (
    <aside className="fila">
      <div className="fila-cabecalho">
        <h3>Fila de processamento</h3>
        <button type="button" className="link-azul" onClick={onLimpar}>
          Limpar
        </button>
      </div>

      {carregando && <p className="fila-vazia">Carregando...</p>}

      {!carregando && itens.length === 0 && (
        <p className="fila-vazia">Nenhum arquivo na fila.</p>
      )}

      <ul className="fila-lista">
        {itens.map((item) => (
          <ItemFila key={item.id} item={item} />
        ))}
      </ul>
    </aside>
  );
}
