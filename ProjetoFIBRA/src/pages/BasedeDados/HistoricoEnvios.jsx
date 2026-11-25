import { useEffect, useState } from "react";
import { listarHistoricoImportacoes, resolverPendencia } from "../../services/baseDadosService";

const estiloFundo = {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
};

const estiloModal = {
    background: "#fff",
    borderRadius: "14px",
    width: "100%",
    maxWidth: "820px",
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)",
};

export function HistoricoEnvios({ aberto, onFechar }) {
    const [lotes, setLotes] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(null);

    useEffect(() => {
        if (!aberto) return;
        let ativo = true;

        listarHistoricoImportacoes()
            .then((dados) => {
                if (ativo) {
                    setLotes(dados);
                    setErro(null);
                }
            })
            .catch((e) => {
                if (ativo) setErro(e.message);
            })
            .finally(() => {
                if (ativo) setCarregando(false);
            });

        return () => {
            ativo = false;
        };
    }, [aberto]);

    if (!aberto) return null;

  async function marcarResolvida(idImportacao, idPendencia) {
    try {
      const { loteConcluido } = await resolverPendencia(idPendencia, idImportacao);
      setLotes((atual) =>
        atual.map((lote) =>
          lote.id_importacao !== idImportacao
            ? lote
            : {
                ...lote,
                status: loteConcluido ? "concluida" : lote.status,
                pendencia_importacao: lote.pendencia_importacao.map((p) =>
                  p.id_pendencia === idPendencia
                    ? { ...p, resolvida_em: new Date().toISOString() }
                    : p
                ),
              }
        )
      );
    } catch (e) {
      setErro(e.message);
    }
  }


    return (
        <div style={estiloFundo} onClick={onFechar}>
            <div style={estiloModal} onClick={(e) => e.stopPropagation()}>
                <header
                    style={{
                        padding: "18px 24px",
                        borderBottom: "1px solid #e2e8f0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <div>
                        <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>
                            Histórico de Importações e Casos de Revisão
                        </h3>
                        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
                            Auditoria de linhas rejeitadas, avisos e planilhas reenviadas
                        </p>
                    </div>
                    <button type="button" className="botao-contorno" onClick={onFechar}>
                        Fechar
                    </button>
                </header>

                <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
                    {carregando && <p>Carregando histórico...</p>}
                    {erro && <p style={{ color: "#dc2626" }}>{erro}</p>}
                    {!carregando && lotes.length === 0 && (
                        <p style={{ color: "#64748b" }}>Nenhuma importação registrada ainda.</p>
                    )}

                    {lotes.map((lote) => (
                        <div
                            key={lote.id_importacao}
                            style={{
                                border: "1px solid #e2e8f0",
                                borderRadius: "10px",
                                padding: "14px 16px",
                                background: "#f8fafc",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                                <strong>
                                    #{lote.id_importacao} · {lote.envios?.nome || "Planilha"}
                                </strong>
                                <span style={{ fontSize: "12px", color: "#475569" }}>
                                    Status: <strong>{lote.status}</strong> · OK: {lote.linhas_ok} · Avisos: {lote.linhas_pendentes} · Rejeitadas: {lote.linhas_erro}
                                </span>
                            </div>

                            {lote.pendencia_importacao?.length > 0 ? (
                                <ul style={{ margin: "12px 0 0", paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {lote.pendencia_importacao.map((pend) => {
                                        const tipoReg = pend.dados?.tipo_registro || "";
                                        const descricao = pend.dados?.descricao || pend.motivo;
                                        const rejeitada = tipoReg === "REJEITADA";
                                        return (
                                            <li key={pend.id_pendencia} style={{ fontSize: "13px", color: "#1e293b" }}>
                                                <span
                                                    style={{
                                                        fontWeight: 600,
                                                        color: rejeitada ? "#dc2626" : "#d97706",
                                                    }}
                                                >
                                                    Linha {pend.numero_linha} ({tipoReg || pend.motivo}):
                                                </span>{" "}
                                                {descricao}
                                                {pend.resolvida_em ? (
                                                    <span style={{ marginLeft: "8px", fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>
                                                        ✓ Revisado
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => marcarResolvida(lote.id_importacao, pend.id_pendencia)}
                                                        style={{
                                                            marginLeft: "10px",
                                                            fontSize: "11px",
                                                            fontWeight: 500,
                                                            color: "#334155",
                                                            padding: "2px 8px",
                                                            borderRadius: "6px",
                                                            border: "1px solid #cbd5e1",
                                                            background: "#fff",
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        Marcar como revisado
                                                    </button>

                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#16a34a" }}>
                                    Nenhuma pendência ou aviso neste lote.
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
