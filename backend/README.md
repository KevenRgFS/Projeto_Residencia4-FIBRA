# Backend FIBRA

API REST em Express e PostgreSQL para empresas, ações, participações, interações de CRM, engajamento, alertas e sincronização com HubSpot.

## Executar

1. Instale uma instância PostgreSQL e crie um banco vazio.
2. Copie `.env.example` para `.env` e preencha `DATABASE_URL` e `JWT_SECRET`.
3. Na pasta `backend`, rode `npm install` e `npm run migrate`.
4. Crie o primeiro usuário definindo `USER_NAME`, `USER_EMAIL` e `USER_PASSWORD` no ambiente e rode `npm run create-user`. A senha precisa ter pelo menos 12 caracteres. Para perfil `empresa`, informe também `USER_COMPANY_ID`.
5. Rode `npm run dev`. A API fica em `http://localhost:3000`; `GET /health` verifica banco e serviço.

## Autenticação e perfis

`POST /api/v1/auth/login` recebe `email` e `password` e devolve um JWT Bearer com validade de 8 horas. Rotas de negócio exigem esse token. Os perfis `admin`, `gestor` e `analista` têm acesso conforme a operação; `empresa` só pode consultar a própria organização e não acessa painel consolidado.

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

Rode `npm test` na pasta `backend`. As migrations são idempotentes e podem ser aplicadas com `npm run migrate` após configurar o banco.