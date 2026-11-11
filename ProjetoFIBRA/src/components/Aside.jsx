import {Folder} from "lucide-react";
import {LayoutGrid} from "lucide-react";
import {Building2} from "lucide-react";
import {ChartNoAxesColumn} from "lucide-react";
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
                    <NavLink to="/perfilEmp"><Building2 /></NavLink>
                    <NavLink to="/empresas"><Folder /></NavLink>
                    <NavLink to="/base-de-dados"><ChartNoAxesColumn /></NavLink>
                </nav>
                <BotaoSair/>
            </aside>
);

}