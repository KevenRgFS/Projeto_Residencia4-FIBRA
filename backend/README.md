# Backend FIBRA

API REST em Express e PostgreSQL para empresas, ações, participações, interações de CRM, engajamento, alertas e sincronização com HubSpot.

## Executar

1. Instale uma instância PostgreSQL e crie um banco vazio.
2. Copie `.env.example` para `.env` e preencha `DATABASE_URL` e `JWT_SECRET`.
3. Na pasta `backend`, rode `npm install` e `npm run migrate`.
4. Crie o primeiro usuário definindo `USER_NAME`, `USER_EMAIL` e `USER_PASSWORD` no ambiente e rode `npm run create-user`. Esse comando cria exclusivamente o administrador-chefe inicial; a senha precisa ter pelo menos 12 caracteres. Os demais usuários são criados e autorizados pelo painel do administrador.
5. Rode `npm run dev`. A API fica em `http://localhost:3000`; `GET /health` verifica banco e serviço.

## Autenticação e perfis

`POST /api/v1/auth/login` recebe `email` e `password` e devolve um JWT Bearer com validade de 8 horas. Rotas de negócio exigem esse token. O administrador-chefe gerencia os usuários em `/api/v1/usuarios`: novos perfis ficam pendentes até serem autorizados. `visitante` consulta gráficos e informações, sem permissão para gravar dados; `gestor` pode importar planilhas e cadastrar/alterar dados; `analista` mantém as permissões operacionais existentes; `empresa` só pode consultar a própria organização.

## Rotas

- `GET /api/v1/empresas`: busca e filtros `search`, `sector`, `size`, `type`, `union`, `engagement`, `page`, `perPage`.
- `GET|POST /api/v1/empresas/:id`; `PATCH /api/v1/empresas/:id`.
- `GET /api/v1/empresas/duplicates` e `POST /api/v1/empresas/:id/merge` (admin).
- `GET|POST /api/v1/acoes` e `GET /api/v1/acoes/:id`.
- `GET|POST /api/v1/participacoes`, `POST /api/v1/participacoes/lote`, `GET /api/v1/participacoes/empresa/:empresaId`, `DELETE /api/v1/participacoes/:id`.
- `GET /api/v1/engajamento/:empresaId`, `PATCH|DELETE /api/v1/engajamento/empresas/:empresaId/override`.
- `GET /api/v1/interacoes` e `POST /api/v1/interacoes`.
- `GET /api/v1/dashboard/overview`, com filtros de data `inicio` e `fim`.
- `GET /api/v1/insights` devolve alertas de alto potencial sem participação nos últimos seis meses e pendências de qualidade de dados.
- `GET /api/v1/sincronizacao` e `POST /api/v1/sincronizacao/hubspot` (admin).
- `GET|POST /api/v1/usuarios` (admin) lista e cria usuários pendentes; `POST /api/v1/usuarios/:id/autorizar` libera o acesso e `POST /api/v1/usuarios/:id/revogar` desativa uma conta.
- `POST /api/v1/empresas/importacao` recebe planilha XLSX ou CSV e grava as empresas no PostgreSQL configurado em `DATABASE_URL`.

Exemplo de participação:

```json
{
  "empresaId": 123,
  "acaoId": 45,
  "dataParticipacao": "2026-09-14",
  "status": "presente"
}
```

## HubSpot e engajamento

Configure `HUBSPOT_ACCESS_TOKEN` para habilitar a sincronização. `HUBSPOT_SYNC_CRON` usa a sintaxe cron do node-cron; o padrão do exemplo é diário à meia-noite. A sincronização importa organizações e endereços disponíveis na API, registra execução e isola dados sem nome ou que falharem na importação. O nome da propriedade customizada de CNPJ é opcional em `HUBSPOT_CNPJ_PROPERTY`.

O score atual é uma regra determinística inicial, não um modelo de IA validado: participação concluída, diversidade de tipos de ação e interações recentes formam a pontuação de 0 a 10; empresas de alto potencial sem participação por 180 dias recebem risco alto. Os pesos e limites devem ser validados com a FIBRA antes de uso decisório. A rota de insights informa que opera por regras, não por LLM. O documento não fornece token HubSpot, provedor/chave de IA, definição final de pesos nem regras de autorização por sindicato; esses itens não são inventados pelo backend.

## Verificação

Na pasta `backend`, rode `npm test` para validar rotas e regras sem exigir um banco PostgreSQL ativo. Para verificar a conexão real com o banco configurado em `.env`, rode:

```powershell
npm run test:db
```

Esse teste executa `SELECT 1` e falha caso `DATABASE_URL` esteja ausente ou o PostgreSQL não esteja acessível. Ele não altera dados nem verifica tabelas. Para conferir também o schema, aplique as migrations com `npm run migrate`; depois, inicie a API e consulte `http://localhost:3000/health`, que deve indicar `status: ok` e `database: connected`.