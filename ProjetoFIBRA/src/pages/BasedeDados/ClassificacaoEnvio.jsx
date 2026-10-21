import { pilares, tiposDeDado } from "../../data/baseDeDados";

// Formulário "Classificação do envio".
// É um formulário controlado: os valores vivem na página (valores)
// e cada campo avisa a mudança com onChange(campo, valor).
// "empresas" é a lista [{ id, nome }] que a página busca no banco.
export function ClassificacaoEnvio({ empresas, valores, onChange }) {
  function campo(nome) {
    return {
      value: valores[nome],
      onChange: (e) => onChange(nome, e.target.value),
    };
  }

  return (
    <section className="classificacao">
      <h3>Classificação do envio</h3>

      <div className="classificacao-grade">
        <label>
          Empresa vinculada
          <select {...campo("empresaId")}>
            <option value="">Selecione a empresa</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>
            ))}
          </select>
        </label>

        <label>
          Pilar do Hub
          <select {...campo("pilar")}>
            {pilares.map((pilar) => (
              <option key={pilar} value={pilar}>{pilar}</option>
            ))}
          </select>
        </label>

        <label>
          Tipo de dado
          <select {...campo("tipoDado")}>
            <option value="">Selecione o tipo</option>
            {tiposDeDado.map((tipo) => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>
        </label>

        <label>
          Período de referência
          <input type="text" placeholder="Ex.: 3º trimestre 2026" {...campo("periodo")} />
        </label>

        <label className="campo-largo">
          Observações
          <input
            type="text"
            placeholder="Contexto adicional que ajuda na interpretação dos dados..."
            {...campo("observacoes")}
          />
        </label>
      </div>
    </section>
  );
}
