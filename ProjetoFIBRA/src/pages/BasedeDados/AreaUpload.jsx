import { useRef, useState } from "react";
import { Triangle } from "lucide-react";
import { EXTENSOES_PERMITIDAS, TAMANHO_MAXIMO_MB } from "../../utils/arquivos";

export function AreaUpload({ onArquivos, desabilitado }) {
  const inputRef = useRef(null);
  const [arrastando, setArrastando] = useState(false);

  function aoSoltar(evento) {
    evento.preventDefault();
    setArrastando(false);
    if (desabilitado) return;
    onArquivos(Array.from(evento.dataTransfer.files));
  }

  function aoEscolher(evento) {
    onArquivos(Array.from(evento.target.files));
    evento.target.value = ""; 
  }

  return (
    <div
      className={`area-upload ${arrastando ? "arrastando" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
      onDragLeave={() => setArrastando(false)}
      onDrop={aoSoltar}
      onClick={() => inputRef.current?.click()}
    >
      <span className="area-upload-icone">
        <Triangle size={14} fill="currentColor" />
      </span>

      <strong>Arraste arquivos aqui ou clique para selecionar</strong>
      <small>
        {EXTENSOES_PERMITIDAS.map((e) => e.toUpperCase()).join(", ").replace(/, ([^,]*)$/, " ou $1")}
        {" · até "}{TAMANHO_MAXIMO_MB} MB por arquivo
      </small>

      <button
        type="button"
        className="botao-contorno"
        disabled={desabilitado}
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
      >
        Selecionar arquivos
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept={EXTENSOES_PERMITIDAS.map((e) => `.${e}`).join(",")}
        onChange={aoEscolher}
      />
    </div>
  );
}
