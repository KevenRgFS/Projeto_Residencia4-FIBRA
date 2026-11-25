import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Login } from "./pages/login/Login";
import { RotaProtegida } from "./components/RotaProtegida";
import { PainelGeral } from "./pages/PainelGeral/PainelGeral";
import { DiretorioEmpresas } from "./pages/DiretorioEmpresas";
import { BasedeDados } from "./pages/BasedeDados/BasedeDados";
import { Layout } from "./components/Layout";
import { Configuracoes } from "./pages/Configuracoes/Configuracoes";
import { Usuarios } from "./pages/Usuarios/Usuarios";
import './App.css'

function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route element={<RotaProtegida />}>
            <Route element={<Layout />}>
              <Route element={<RotaProtegida roles={["admin", "gestor", "analista", "visitante"]} />}>
                <Route path="/painel" element={<PainelGeral />} />
                <Route path="/empresas" element={<DiretorioEmpresas />} />
              </Route>
              <Route element={<RotaProtegida roles={["admin", "gestor", "analista"]} />}>
                <Route path="/base-de-dados" element={<BasedeDados />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
              </Route>
              <Route element={<RotaProtegida roles={["admin"]} />}>
                <Route path="/usuarios" element={<Usuarios />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>

      <script src="script.js"></script>
    </>
  );
}

export default App
