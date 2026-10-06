const tabelaEmpresas = document.getElementById("empresas");
const botaoAtualizar = document.getElementById("atualizarEmpresas");
const contadorEmpresas = document.getElementById("contador"); 


async function carregarempresas() {

    const resposta = await fetch("http://localhost:3000/api/v1/empresas");

    const empresas = await resposta.json();
    console.log(empresas);


    tabelaEmpresas.innerHTML = "";

    empresas.forEach(empresa => {
        
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${empresa.nome}</td>
            <td>${empresa.setor}</td>
            <td>${empresa.porte}</td>
            <td>${empresa.score}</td>
            <td>${empresa.ultimaInteracao}</td>
            <td>${empresa.status}</td>
            <td>⋮</td>`;

            tabelaEmpresas.appendChild(linha);
    });

    contadorEmpresas.textContent = empresas.length;

}


botaoAtualizar.addEventListener("click", carregarempresas);
