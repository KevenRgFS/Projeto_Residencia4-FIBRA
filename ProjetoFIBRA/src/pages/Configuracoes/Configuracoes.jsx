import { AlterarSenha } from "./AlterarSenha";
import {DuasEtapas} from "./DuasEtapas";
import {SessoesAtivas } from "./SessoesAtivas";

import "./configuracoes.css";


export function Configuracoes(){

return(
    <section className="configuracoes">
        <h2>Segurança</h2>
        <p>Gerencie sua senha:</p>
        <AlterarSenha/>
        <DuasEtapas/>
        <SessoesAtivas/>
    </section>
    );
}