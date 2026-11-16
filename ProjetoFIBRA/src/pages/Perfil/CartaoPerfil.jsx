// Pega a primeira letra do primeiro e do último nome: "Roberto Silva" vira "RS"
function iniciais(nome) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export function CartaoPerfil({ perfil, foto, onFoto }) {
  function escolher(e) {
    const arquivo = e.target.files[0];
    if (arquivo) onFoto(arquivo);
    e.target.value = ""; // permite escolher a mesma foto de novo
  }

  return (
    <section className="perfil-cartao">
      <div className="perfil-avatar">
        {foto ? <img src={foto} alt="Foto de perfil" /> : iniciais(perfil.nome_completo)}
      </div>

      <div className="perfil-resumo">
        <h2>{perfil.nome_completo}</h2>
        <p>{perfil.cargo} · {perfil.organizacao}</p>
        <small>{perfil.email}</small>
      </div>

      <label className="perfil-botao perfil-contorno">
        Editar foto
        <input type="file" accept="image/*" hidden onChange={escolher} />
      </label>
    </section>
  );
}
