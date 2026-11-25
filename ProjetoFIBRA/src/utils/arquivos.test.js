import test from "node:test";
import assert from "node:assert/strict";
import { validarArquivo, formatarTamanho, TAMANHO_MAXIMO_MB } from "./arquivos.js";

test("Upload: aceita arquivos XLSX e CSV de até 5 MB", () => {
    const arquivoValido = {
        name: "relatorio_empresas.xlsx",
        size: 5 * 1024 * 1024, // 5 MB
    };

    const erro = validarArquivo(arquivoValido);
    assert.equal(erro, null);
});

test("Upload: rejeita arquivos com extensão não permitida (.exe, .png, .txt)", () => {
    const arquivoInvalido = {
        name: "script_malicioso.exe",
        size: 1024,
    };

    const erro = validarArquivo(arquivoInvalido);
    assert.equal(
        erro,
        '"script_malicioso.exe": formato não aceito (use XLSX ou CSV).'
    );
});

test("Upload: rejeita arquivos que ultrapassam o limite de 5 MB", () => {
    const arquivoMuitoGrande = {
        name: "base_completa.csv",
        size: (TAMANHO_MAXIMO_MB + 1) * 1024 * 1024, // 6 MB
    };

    const erro = validarArquivo(arquivoMuitoGrande);
    assert.equal(erro, `"base_completa.csv": passa de ${TAMANHO_MAXIMO_MB} MB.`);
});

test("Formatação: formata tamanhos em KB corretamente", () => {
    assert.equal(formatarTamanho(512 * 1024), "512 KB");
});
