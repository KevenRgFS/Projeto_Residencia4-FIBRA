import { BrowserRouter, Routes, Route } from "react-router-dom"
import { PainelGeral } from "./pages/PainelGeral/PainelGeral";
import { DiretorioEmpresas } from "./pages/DiretorioEmpresas";
import { Layout } from "./components/Layout";
import './App.css'

function App() {
  //const [count, setCount] = useState(0)

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<PainelGeral />} />
            <Route path="/empresas" element={<DiretorioEmpresas />} />
          </Route>
        </Routes>
      </BrowserRouter>

      <script src="script.js"></script>
    </>
  );
}

export default App
