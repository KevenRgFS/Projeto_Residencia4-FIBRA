function Campo({ rotulo, chave, valores, onAlterar, tipo = "text" }) {
  return (
    <label className="perfil-campo">
      {rotulo}
      <input type={tipo} value={valores[chave]} onChange={(e) => onAlterar(chave, e.target.value)} />
    </label>
  );
}

export function InformacoesPessoais({ valores, onAlterar, alterado, salvando, onSalvar, onCancelar }) {
  return (
    <section className="perfil-informacoes">
      <h3>Informações pessoais</h3>

      <div className="perfil-grade">
        <Campo rotulo="Nome completo" chave="nome_completo" valores={valores} onAlterar={onAlterar} />
        <Campo rotulo="Cargo" chave="cargo" valores={valores} onAlterar={onAlterar} />
        <Campo rotulo="E-mail institucional" chave="email" tipo="email" valores={valores} onAlterar={onAlterar} />
        <Campo rotulo="Telefone" chave="telefone" tipo="tel" valores={valores} onAlterar={onAlterar} />
        <Campo rotulo="Departamento" chave="departamento" valores={valores} onAlterar={onAlterar} />

      </div>

      <div className="perfil-acoes">
        <button type="button" className="perfil-botao perfil-primario" disabled={!alterado || salvando} onClick={onSalvar}>
          {salvando ? "Salvando..." : "Salvar informações"}
        </button>
        <button type="button" className="perfil-botao perfil-cancelar" disabled={!alterado || salvando} onClick={onCancelar}>
          Cancelar alterações
        </button>
      </div>
    </section>
  );
}
