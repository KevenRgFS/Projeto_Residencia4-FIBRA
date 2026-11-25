import {Search} from "lucide-react";
import {Bolt} from "lucide-react";
import {BellRing} from "lucide-react";
import { useLocation } from "react-router-dom";
import { obterUsuario } from "../services/autenticacaoService";
import { ROTULOS_PERFIL } from "../utils/perfis";

const TITULOS = {
    "/painel": "Painel Geral",
    "/empresas": "Diretório de Empresas",
    "/base-de-dados": "Base de Dados",
    "/usuarios": "Gerenciar Usuários",
};
export function Header(){

const { pathname } = useLocation();
const usuario = obterUsuario();

return(

    <header className="topbar">

        <div className="brand">
            <strong>FIBRA</strong>
            <span>| Hub de Inovação</span>

            <div className="divider"></div>

            <span>{TITULOS[pathname] ?? ""}</span>
        </div>

        <div className="top-actions">

            <button className="search-icon"><Search className="i-icons"/></button>
            <input
                type="text"
                placeholder=" Buscar empresas, programas, CNPJ..."
            ></input>

            <button className="icon-button"><Bolt className="i-icons"/></button>
            <button className="icon-button"><BellRing className="i-icons"/></button>

            <div className="user">
                <strong>{usuario?.name || "Usuário"}</strong>
                <small>{ROTULOS_PERFIL[usuario?.role] || "Perfil"}</small>
            </div>

        </div>

    </header>

);

}