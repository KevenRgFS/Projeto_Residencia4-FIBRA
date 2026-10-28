import test from "node:test";
import assert from "node:assert/strict";
import { validarArquivo, formatarTamanho, TAMANHO_MAXIMO_MB } from "./arquivos.js";

test("Upload: deve aceitar arquivos com extensões permitidas (PDF, DOCX, XLSX, CSV) até 25 MB", () => {
    const arquivoValido = {
        name: "relatorio_empresas.xlsx",
        size: 5 * 1024 * 1024, // 5 MB
    };

    const erro = validarArquivo(arquivoValido);
    assert.equal(erro, null);
});

test("Upload: deve rejeitar arquivos com extensão não permitida (.exe, .png, .txt)", () => {
    const arquivoInvalido = {
        name: "script_malicioso.exe",
        size: 1024,
    };

    const erro = validarArquivo(arquivoInvalido);
    assert.equal(
        erro,
        '"script_malicioso.exe": formato não aceito (use PDF, DOCX, XLSX ou CSV).'
    );
});

test("Upload: deve rejeitar arquivos que ultrapassam o limite de 25 MB", () => {
    const arquivoMuitoGrande = {
        name: "base_completa.csv",
        size: (TAMANHO_MAXIMO_MB + 1) * 1024 * 1024, // 26 MB
    };

    const erro = validarArquivo(arquivoMuitoGrande);
    assert.equal(erro, `"base_completa.csv": passa de ${TAMANHO_MAXIMO_MB} MB.`);
});

test("Formatação: deve formatar tamanhos em KB corretamente", () => {
    assert.equal(formatarTamanho(512 * 1024), "512 KB");
});
