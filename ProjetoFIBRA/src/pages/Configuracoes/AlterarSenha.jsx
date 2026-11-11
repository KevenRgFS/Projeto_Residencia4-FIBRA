import {useState} from "react";

export function AlterarSenha() {

    const [form, setForm] = useState({"senha_atual": "", "nova_senha": "", "confirma_senha": ""});
    const [aviso, setAviso] = useState(null);

    function alterar(campo, valor) {
        setForm((atual) => ({ ...atual, [campo]: valor }));
    };

    return (

        <section>
            <h3>Alterar Senha:</h3>

            <label>
                Nova Senha
                <input type="password" value={form.senha_atual} onChange={(e) => alterar("senha_atual", e.target.value)}/>
            </label>

        </section>
    );
}