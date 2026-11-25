import { Navigate, Outlet } from "react-router-dom";
import { estaLogado, obterUsuario } from "../services/autenticacaoService";

export function RotaProtegida({ roles }) {
  if (!estaLogado()) return <Navigate to="/" replace />;
  const usuario = obterUsuario();
  if (roles && !roles.includes(usuario?.role)) {
    return <Navigate to={usuario?.role === "empresa" ? "/perfil" : "/painel"} replace />;
  }
  return <Outlet />;
}