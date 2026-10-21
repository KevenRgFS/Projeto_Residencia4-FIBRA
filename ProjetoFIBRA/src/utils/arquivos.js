export const EXTENSOES_PERMITIDAS = ["pdf", "docx", "xlsx", "csv"];
export const TAMANHO_MAXIMO_MB = 25;

export function validarArquivo(arquivo) {
  const extensao = arquivo.name.split(".").pop().toLowerCase();

  if (!EXTENSOES_PERMITIDAS.includes(extensao)) {
    return `"${arquivo.name}": formato não aceito (use PDF, DOCX, XLSX ou CSV).`;
  }
  if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
    return `"${arquivo.name}": passa de ${TAMANHO_MAXIMO_MB} MB.`;
  }
  return null;
}

export function formatarTamanho(bytes) {
  if (bytes >= 1024 * 1024) {
    const mb = (bytes / (1024 * 1024)).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    });
    return `${mb} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}
