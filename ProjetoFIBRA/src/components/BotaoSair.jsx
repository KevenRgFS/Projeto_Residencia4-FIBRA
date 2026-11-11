import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { sair } from "../services/autenticacaoService";
import "./BotaoSair.css";

// Botão de sair da sidebar: encerra o login e volta para a tela inicial.
export function BotaoSair() {
  const navigate = useNavigate();

  async function sairDoSistema() {
    await sair();
    navigate("/", { replace: true });
  }

  return (
    <button
      type="button"
      className="sidebar-sair"
      onClick={sairDoSistema}
      aria-label="Sair"
      title="Sair"
    >
      <LogOut />
    </button>
  );
}
