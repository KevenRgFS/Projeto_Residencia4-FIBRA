import { Navigate, Outlet } from "react-router-dom";
import { estaLogado } from "../services/autenticacaoService";

export function RotaProtegida() {
  return estaLogado() ? <Outlet /> : <Navigate to="/" replace />;
}