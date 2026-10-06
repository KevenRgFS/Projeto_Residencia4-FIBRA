const express = require("express");
const cors = require("cors");
const app = express(); 

app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
    res.send("<h1>Olá Mundo!</h1>")
})
const empresas = [
    {
            "id": 1,
            "nome": "Metalúrgica São Paulo S.A",
            "setor": "Metalurgica",
            "porte": "grande",
            "score": "84",
            "ultimaInteracao": "2 dias",
            "status": "ativo"
        },
        {
            "id": 2,
            "nome": "Alimentos Cerrado LTDA.",
            "setor": "alimentos",
            "porte": "médio",
            "score": "72",
            "ultimaInteracao": "Ontem, 17:20",
            "status": "ativo"
        },
];

app.get("/api/v1/empresas", (req, res)=>{
    res.json(empresas);
}); 

const PORT = 3000;

app.listen(PORT, ()=>{
    console.log(`Servidor sendo ouvido na porta: ${PORT}`);
});

