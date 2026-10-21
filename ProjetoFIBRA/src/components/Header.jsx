import {Search} from "lucide-react";
import {Bolt} from "lucide-react";
import {BellRing} from "lucide-react";
import { useLocation } from "react-router-dom";

const TITULOS = {
    "/": "Painel Geral",
    "/empresas": "Diretório de Empresas",
    "/base-de-dados": "Base de Dados",
};
export function Header(){

const { pathname } = useLocation();

return(

    <header class="topbar">

        <div class="brand">
            <strong>FIBRA</strong>
            <span>| Hub de Inovação</span>

            <div class="divider"></div>

            <span>{TITULOS[pathname] ?? ""}</span>
        </div>

        <div class="top-actions">

            <button class="search-icon"><Search className="i-icons"/></button>
            <input
                type="text"
                placeholder=" Buscar empresas, programas, CNPJ..."
            ></input>

            <button class="icon-button"><Bolt className="i-icons"/></button>
            <button class="icon-button"><BellRing className="i-icons"/></button>

            <div class="user">
                <strong>Roberto Silva</strong>
                <small>Analista Sênior</small>
            </div>

        </div>

    </header>

);

}