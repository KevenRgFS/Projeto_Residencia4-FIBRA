import { Folder, LayoutGrid, Database, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { BotaoSair } from "./BotaoSair";
import { obterUsuario } from "../services/autenticacaoService";

export function Aside(){
  const usuario = obterUsuario();
  const podeVerEmpresas = ["admin", "gestor", "analista", "visitante"].includes(usuario?.role);
  const podeEditarDados = ["admin", "gestor", "analista"].includes(usuario?.role);

  return (
    <aside className="sidebar">
      <div className="logo">F</div>
      <nav aria-label="Navegação principal">
        {podeVerEmpresas && <NavLink to="/painel" title="Painel geral" aria-label="Painel geral"><LayoutGrid /></NavLink>}
        {podeVerEmpresas && <NavLink to="/empresas" title="Empresas" aria-label="Empresas"><Folder /></NavLink>}
        {podeEditarDados && <NavLink to="/base-de-dados" title="Base de dados" aria-label="Base de dados"><Database /></NavLink>}
        {usuario?.role === "admin" && <NavLink to="/usuarios" title="Usuários" aria-label="Usuários"><Users /></NavLink>}
      </nav>
      <BotaoSair />
    </aside>
  );
}