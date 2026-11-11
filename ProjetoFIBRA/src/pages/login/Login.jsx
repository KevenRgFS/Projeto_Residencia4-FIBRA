import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { entrar, entrarComGoogle, estaLogado } from "../../services/autenticacaoService";
import "./Login.css";

function GoogleLogo() {
  return (
    <svg className="google-logo" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: "", senha: "" });
  const [aviso, setAviso] = useState(null);
  const [enviando, setEnviando] = useState(false);

  // quem já está logado vai direto para o painel
  if (estaLogado()) return <Navigate to="/painel" replace />;

  function alterar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function enviar(e) {
    e.preventDefault();

    if (!form.nome.trim() || !form.senha) {
      setAviso("Preencha o nome e a senha para entrar.");
      return;
    }

    setEnviando(true);
    setAviso(null);
    try {
      await entrar(form.nome.trim(), form.senha);
      navigate("/painel", { replace: true });
    } catch (erro) {
      setAviso(erro.message);
      setEnviando(false);
    }
  }

  async function entrarGoogle() {
    setAviso(null);
    try {
      await entrarComGoogle();
      navigate("/painel", { replace: true });
    } catch (erro) {
      setAviso(erro.message);
    }
  }

  return (
    <main className="login">
      <section className="login-cartao">
        <h1 className="login-marca">FIBRA</h1>
        <p className="login-subtitulo">Hub de Inovação</p>

        <form onSubmit={enviar} noValidate>
          <label className="login-campo">
            Nome
            <input
              type="text"
              placeholder="Digite seu nome.."
              autoComplete="username"
              value={form.nome}
              onChange={(e) => alterar("nome", e.target.value)}
            />
          </label>

          <label className="login-campo">
            Senha
            <input
              type="password"
              placeholder="Digite sua senha.."
              autoComplete="current-password"
              value={form.senha}
              onChange={(e) => alterar("senha", e.target.value)}
            />
          </label>

          <button
            type="button"
            className="login-link"
            onClick={() => setAviso("A recuperação de senha ainda não está disponível.")}
          >
            Esqueceu a senha?
          </button>

          {aviso && <p className="login-aviso" role="alert">{aviso}</p>}

          <button type="button" className="login-google" onClick={entrarGoogle}>
            Conecte-se com o <GoogleLogo />
          </button>

          <button type="submit" className="login-entrar" disabled={enviando}>
            {enviando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <button
          type="button"
          className="login-link login-acesso"
          onClick={() => setAviso("A solicitação de acesso ainda não está disponível.")}
        >
          Solicite Acesso
        </button>
      </section>

      <div className="login-faixa" />
    </main>
  );
}
