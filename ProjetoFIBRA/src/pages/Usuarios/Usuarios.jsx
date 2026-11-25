import { useCallback, useEffect, useState } from "react";
import { requisitarApi } from "../../services/apiService";
import { obterUsuario } from "../../services/autenticacaoService";
import { ROTULOS_PERFIL, ROTULOS_STATUS_USUARIO } from "../../utils/perfis";
import "./Usuarios.css";

const FORMULARIO_INICIAL = {
  name: "",
  email: "",
  password: "",
  role: "visitante",
  companyId: "",
};

export function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const usuarioAtual = obterUsuario();

  const carregarUsuarios = useCallback(async () => {
    try {
      const resposta = await requisitarApi("/usuarios");
      setUsuarios(resposta.data);
    } catch (erro) {
      setAviso({ tipo: "erro", texto: erro.message });
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    requisitarApi("/usuarios")
      .then((resposta) => {
        if (ativo) setUsuarios(resposta.data);
      })
      .catch((erro) => {
        if (ativo) setAviso({ tipo: "erro", texto: erro.message });
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => { ativo = false; };
  }, []);

  function alterar(campo, valor) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  }

  async function criarUsuario(evento) {
    evento.preventDefault();
    setSalvando(true);
    setAviso(null);
    const dados = { ...formulario };
    if (dados.role === "empresa") dados.companyId = Number(dados.companyId);
    else delete dados.companyId;

    try {
      await requisitarApi("/usuarios", { metodo: "POST", corpo: dados });
      setFormulario(FORMULARIO_INICIAL);
      setAviso({ tipo: "ok", texto: "Perfil criado. Autorize o acesso na lista de usuários." });
      await carregarUsuarios();
    } catch (erro) {
      setAviso({ tipo: "erro", texto: erro.message });
    } finally {
      setSalvando(false);
    }
  }

  async function executarAcao(usuario, acao) {
    setAviso(null);
    try {
      await requisitarApi(`/usuarios/${usuario.id}/${acao}`, { metodo: "POST" });
      await carregarUsuarios();
    } catch (erro) {
      setAviso({ tipo: "erro", texto: erro.message });
    }
  }

  return (
    <section className="usuarios">
      <header className="usuarios-cabecalho">
        <div>
          <h2>Gerenciar usuários</h2>
          <p>Crie perfis, defina o nível de acesso e autorize as contas.</p>
        </div>
      </header>

      {aviso && <p className={`usuarios-aviso ${aviso.tipo}`} role="alert">{aviso.texto}</p>}

      <form className="usuarios-formulario" onSubmit={criarUsuario}>
        <h3>Criar perfil</h3>
        <div className="usuarios-campos">
          <label>
            Nome
            <input required maxLength="100" value={formulario.name} onChange={(e) => alterar("name", e.target.value)} />
          </label>
          <label>
            E-mail
            <input required type="email" maxLength="254" value={formulario.email} onChange={(e) => alterar("email", e.target.value)} />
          </label>
          <label>
            Senha inicial (mínimo 12 caracteres)
            <input required type="password" minLength="12" maxLength="200" value={formulario.password} onChange={(e) => alterar("password", e.target.value)} />
          </label>
          <label>
            Perfil
            <select value={formulario.role} onChange={(e) => alterar("role", e.target.value)}>
              {Object.entries(ROTULOS_PERFIL).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>{rotulo}</option>
              ))}
            </select>
          </label>
          {formulario.role === "empresa" && (
            <label>
              ID da organização
              <input required type="number" min="1" value={formulario.companyId} onChange={(e) => alterar("companyId", e.target.value)} />
            </label>
          )}
        </div>
        <button className="usuarios-botao primario" type="submit" disabled={salvando}>
          {salvando ? "Criando..." : "Criar perfil pendente"}
        </button>
      </form>

      <section className="usuarios-lista">
        <h3>Perfis cadastrados</h3>
        {carregando ? <p>Carregando usuários...</p> : usuarios.length === 0 ? (
          <p>Nenhum usuário cadastrado.</p>
        ) : (
          <div className="usuarios-tabela-conteudo">
            {usuarios.map((usuario) => (
              <article className="usuario-linha" key={usuario.id}>
                <div className="usuario-identificacao">
                  <strong>{usuario.name}</strong>
                  <span>{usuario.email}</span>
                </div>
                <span>{ROTULOS_PERFIL[usuario.role] || usuario.role}</span>
                <span className={`usuario-status ${usuario.status}`}>{ROTULOS_STATUS_USUARIO[usuario.status] || usuario.status}</span>
                {usuario.status === "pendente" ? (
                  <button className="usuarios-botao primario" type="button" onClick={() => executarAcao(usuario, "autorizar")}>
                    Autorizar
                  </button>
                ) : usuario.status === "ativo" && usuario.id !== usuarioAtual?.id ? (
                  <button className="usuarios-botao" type="button" onClick={() => executarAcao(usuario, "revogar")}>
                    Revogar acesso
                  </button>
                ) : <span className="usuario-sem-acao">—</span>}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
