import { useEffect, useState } from "react";
import { buscarPerfil, salvarPerfil } from "../../services/perfilService";
import { CartaoPerfil } from "./CartaoPerfil";
import { InformacoesPessoais } from "./InformacoesPessoais";
import "./Perfil.css";

export function Perfil() {
  const [salvo, setSalvo] = useState(null); // último perfil salvo (alimenta o cartão do topo)
  const [form, setForm] = useState(null); // o que está escrito nos campos agora
  const [foto, setFoto] = useState(null); // pré-visualização da foto escolhida
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo: "erro" | "ok", texto }

  useEffect(() => {
    async function carregar() {
      try {
        const perfil = await buscarPerfil();
        setSalvo(perfil);
        setForm(perfil);
      } catch (e) {
        setAviso({ tipo: "erro", texto: `Não foi possível carregar o perfil: ${e.message}` });
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  function alterar(campo, valor) {
    setAviso(null);
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function cancelar() {
    setForm(salvo);
    setAviso(null);
  }

  function escolherFoto(arquivo) {
    if (foto) URL.revokeObjectURL(foto);
    // SUPABASE (ideia): enviar o arquivo para o Storage e guardar o endereço no perfil
    setFoto(URL.createObjectURL(arquivo));
  }

  async function salvar() {
    if (!form.nome_completo.trim()) {
      setAviso({ tipo: "erro", texto: "Informe o nome completo." });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setAviso({ tipo: "erro", texto: "Informe um e-mail válido." });
      return;
    }

    setSalvando(true);
    setAviso(null);
    try {
      const novo = await salvarPerfil(form);
      setSalvo(novo);
      setForm(novo);
      setAviso({ tipo: "ok", texto: "Informações salvas com sucesso." });
    } catch (e) {
      setAviso({ tipo: "erro", texto: `Não foi possível salvar: ${e.message}` });
    } finally {
      setSalvando(false);
    }
  }

  const alterado = salvo && form && JSON.stringify(form) !== JSON.stringify(salvo);

  return (
    <section className="perfil">
      {carregando && <p className="perfil-vazio">Carregando perfil...</p>}

      {aviso && <p className={`perfil-aviso ${aviso.tipo}`}>{aviso.texto}</p>}

      {form && (
        <>
          <CartaoPerfil perfil={salvo} foto={foto} onFoto={escolherFoto} />
          <InformacoesPessoais
            valores={form}
            onAlterar={alterar}
            alterado={alterado}
            salvando={salvando}
            onSalvar={salvar}
            onCancelar={cancelar}
          />
        </>
      )}
    </section>
  );
}
