import { useState } from "react";
import { Filtros } from "../components/Filtros";
import { Table } from "../components/Table";
import { empresas as dadosEmpresas } from "../data/empresas";

export function DiretorioEmpresas() {

  const [empresas, setEmpresas] = useState([]);

  function atualizarEmpresas() {
    setEmpresas(dadosEmpresas);
  }

  return (
    <>
      <Filtros onAtualizar={atualizarEmpresas} />
      <Table empresas={empresas} />
    </>
  );
}