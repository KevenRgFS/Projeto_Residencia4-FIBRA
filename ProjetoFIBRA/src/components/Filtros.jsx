export function Filtros({ onAtualizar }) {

    return (
        <section className="filters">
            <select>
                <option>Setor: Todos</option>
                <option>Metalurgia</option>
                <option>Alimentos</option>
                <option>Construção</option>
                <option>Química</option>
            </select>

            <select>
                <option>Porte: Todos</option>
                <option>Grande</option>
                <option>Médio</option>
                <option>Pequeno</option>
            </select>

            <select>
                <option>Pilar: Todos</option>
                <option>Inovação</option>
                <option>Indústria</option>
            </select>

            <div className="score-filter">
                <span>Score:</span>
                <strong>0 - 100</strong>
                <div className="score-line"></div>
            </div>

            <button type="button" className="clear-button" onClick={onAtualizar}>
                Atualizar Empresas
            </button>

            <button type="button" className="clear-button">
                Limpar Filtros
            </button>
        </section>
    );
}

