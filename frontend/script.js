const tabelaEmpresas = document.getElementById("empresas");
const botaoAtualizar = document.getElementById("atualizarEmpresas");
const contadorEmpresas = document.getElementById("contador"); 
const formularioImportacao = document.getElementById("importarPlanilha");
const resultadoImportacao = document.getElementById("resultadoImportacao");


async function carregarempresas(token = document.getElementById("tokenImportacao").value.trim()) {
    const resposta = await fetch("http://localhost:3000/api/v1/empresas", {
        headers: { Authorization: `Bearer ${token}` },
    });
    const resultado = await resposta.json();
    if (!resposta.ok) throw new Error(resultado.error || "Não foi possível carregar as empresas.");
    const empresas = resultado.data || resultado;


    tabelaEmpresas.innerHTML = "";

    empresas.forEach(empresa => {
        
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${empresa.name || empresa.nome || "—"}</td>
            <td>${empresa.sector || empresa.setor || "—"}</td>
            <td>${empresa.size || empresa.porte || "—"}</td>
            <td>${empresa.engagementScore ?? empresa.score ?? "—"}</td>
            <td>${empresa.updatedAt ? new Date(empresa.updatedAt).toLocaleDateString("pt-BR") : (empresa.ultimaInteracao || "—")}</td>
            <td>${empresa.riskLevel || empresa.status || "—"}</td>
            <td>⋮</td>`;

            tabelaEmpresas.appendChild(linha);
    });

    contadorEmpresas.textContent = empresas.length;

}


botaoAtualizar.addEventListener("click", () => carregarempresas().catch((error) => {
    resultadoImportacao.className = "error";
    resultadoImportacao.textContent = error.message;
}));

formularioImportacao.addEventListener("submit", async (event) => {
    event.preventDefault();
    const arquivo = document.getElementById("arquivoPlanilha").files[0];
    const token = document.getElementById("tokenImportacao").value.trim();
    resultadoImportacao.className = "";
    resultadoImportacao.textContent = "Enviando planilha...";
    const dados = new FormData();
    dados.append("arquivo", arquivo);
    try {
        const resposta = await fetch("http://localhost:3000/api/v1/empresas/importacao", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: dados,
        });
        const resultado = await resposta.json();
        if (!resposta.ok) throw new Error(resultado.error || "Não foi possível importar a planilha.");
        resultadoImportacao.className = "success";
        resultadoImportacao.textContent = `${resultado.imported} registros importados ou atualizados.`;
        formularioImportacao.reset();
        try {
            await carregarempresas(token);
        } catch {
            resultadoImportacao.textContent += " A lista não foi atualizada; use Atualizar Empresas.";
        }
    } catch (error) {
        resultadoImportacao.className = "error";
        resultadoImportacao.textContent = error.message;
    }
});
