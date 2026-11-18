import {Search} from "lucide-react";
import {Bolt} from "lucide-react";
import {BellRing} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const TITULOS = {
    "/painel": "Painel Geral",
    "/empresas": "Diretório de Empresas",
    "/base-de-dados": "Base de Dados",
    "/perfil": "Meu Perfil",
};
export function Header(){

const { pathname } = useLocation();

return(

    <header className="topbar">

        <div className="brand">
            <strong>FIBRA</strong>
            <span>| Hub de Inovação</span>

            <div className="divider"></div>

            <span>{TITULOS[pathname] ?? ""}</span>
        </div>

        <div className="top-actions">

            <input
                type="text"
                placeholder=" Buscar empresas, programas, CNPJ..."
            ></input>

            <button className="search-icon"><Search className="i-icons"/></button>

            <button className="icon-button"><Bolt className="i-icons"/></button>
            <button className="icon-button"><BellRing className="i-icons"/></button>


            <Link to="/perfil" className="user">
                <strong>Roberto Silva</strong>
                <small>Analista Sênior</small>
            </Link>


        </div>

    </header>

);

}