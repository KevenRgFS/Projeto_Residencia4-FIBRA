import {Folder} from "lucide-react";
import {LayoutGrid} from "lucide-react";
import {User} from "lucide-react";
import { FileDatabase } from "lucide-react";
import { NavLink } from "react-router-dom";
import { BotaoSair } from "./BotaoSair";

export function Aside(){
return(
    <aside className="sidebar">

                <div className="logo">
                    F
                </div>

                <nav>
                    <NavLink to="/painel"><LayoutGrid /></NavLink>
                    <NavLink to="/perfil"><User /></NavLink>
                    <NavLink to="/empresas"><Folder /></NavLink>
                    <NavLink to="/base-de-dados"><FileDatabase /></NavLink>
                </nav>
                <BotaoSair/>
            </aside>
);

}