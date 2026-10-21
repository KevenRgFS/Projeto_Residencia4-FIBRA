import { formatarTamanho } from "../../utils/arquivos";

// Texto e cor (classe CSS) de cada status. A chave é o valor guardado no banco.
const STATUS = {
  indexado: { rotulo: "Indexado", classe: "verde" },
  processando: { rotulo: "Processando", classe: "azul" },
  na_fila: { rotulo: "Na fila", classe: "turquesa" },
  erro: { rotulo: "Erro", classe: "laranja" },
};

export function ItemFila({ item }) {
  const status = STATUS[item.status] ?? STATUS.na_fila;

  return (
    <li className="item-fila">
      <div className="item-fila-topo">
        <span className="item-fila-nome">{item.nome}</span>
        <span className={`selo ${status.classe}`}>{status.rotulo}</span>
      </div>

      <small className="item-fila-meta">
        {formatarTamanho(item.tamanhoBytes)} · {item.detalhe}
      </small>

      <div className="barra">
        <div
          className={`barra-preenchimento ${status.classe}`}
          style={{ width: `${item.progresso}%` }}
        />
      </div>
    </li>
  );
}
