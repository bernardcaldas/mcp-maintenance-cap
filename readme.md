# mcp-maintenance-cap

MCP Server para Ordens de Manutenção SAP S/4HANA, deployado no SAP BTP (Cloud Foundry).

Expõe dados do [SAP Business Accelerator Hub](https://api.sap.com) via protocolo MCP, permitindo que clientes como Claude Desktop consultem ordens de manutenção em linguagem natural.

---

## Arquitetura

```
Claude Desktop (MCP Client)
        │
        │  HTTP/MCP
        ▼
SAP BTP Cloud Foundry
  └── mcp-maintenance-cap (CAP + Express)
        │  GET/POST /mcp/*
        │
        │  OData REST
        ▼
SAP Business Accelerator Hub
  └── API_MAINTENANCEORDER (sandbox S/4HANA)
```

**Stack:**
- [SAP CAP](https://cap.cloud.sap) — framework base (bootstrap/roteamento)
- Express — rotas MCP registradas via hook `cds.on('bootstrap')`
- Axios — cliente HTTP para a API OData do SAP
- SAP BTP Cloud Foundry — hospedagem

---

## Estrutura do Projeto

```
srv/
  server.js        ← entry point: registra as rotas no bootstrap do CAP
  mcp-handler.js   ← lógica das tools e rotas Express (/mcp/*)
  mcp-service.cds  ← placeholder CDS obrigatório para o CAP inicializar
manifest.yml       ← configuração de deploy no Cloud Foundry (sem segredos)
```

---

## Tools disponíveis

| Tool | Descrição |
|------|-----------|
| `get_maintenance_orders` | Lista ordens de manutenção com filtros opcionais |
| `get_maintenance_order_detail` | Detalhe de uma ordem específica |
| `get_maintenance_order_operations` | Operações de uma ordem |

---

## Endpoints

| Método | Path | Descrição |
|--------|------|-----------|
| `GET` | `/mcp/health` | Health check da aplicação |
| `GET` | `/mcp/tools` | Lista as tools disponíveis |
| `POST` | `/mcp/call` | Executa uma tool |

### Exemplo — listar ordens

```bash
curl -X POST https://<sua-app>.cfapps.us10-001.hana.ondemand.com/mcp/call \
  -H "Content-Type: application/json" \
  -d '{"tool": "get_maintenance_orders", "input": {"top": 5}}'
```

### Exemplo — detalhe de uma ordem

```bash
curl -X POST https://<sua-app>.cfapps.us10-001.hana.ondemand.com/mcp/call \
  -H "Content-Type: application/json" \
  -d '{"tool": "get_maintenance_order_detail", "input": {"maintenanceOrder": "4000300"}}'
```

### Exemplo — operações de uma ordem

```bash
curl -X POST https://<sua-app>.cfapps.us10-001.hana.ondemand.com/mcp/call \
  -H "Content-Type: application/json" \
  -d '{"tool": "get_maintenance_order_operations", "input": {"maintenanceOrder": "4000300", "top": 10}}'
```

---

## Configuração e Deploy

### Pré-requisitos

- Node.js 20+
- [CF CLI](https://docs.cloudfoundry.org/cf-cli/)
- Conta no SAP BTP (trial funciona)
- API Key do [SAP Business Accelerator Hub](https://api.sap.com)

### Rodar local

```bash
npm install
npm run dev
# Disponível em http://localhost:4004
```

### Deploy no BTP

```bash
cf login -a https://api.cf.us10-001.hana.ondemand.com
cf push mcp-maintenance-cap
```

### Setar a API Key (obrigatório após o deploy)

**Nunca coloque a API Key no manifest.yml ou no código.** Configure via variável de ambiente no CF:

```bash
cf set-env mcp-maintenance-cap SAP_API_KEY "sua-chave-aqui"
cf restart mcp-maintenance-cap
```

A chave fica armazenada apenas no ambiente do CF, fora do repositório.

---

## Lições Aprendidas

Esta seção registra decisões arquiteturais não óbvias para reutilização em projetos similares.

### 1. Não usar CDS service para expor rotas MCP

A abordagem natural no CAP seria definir funções/actions no `.cds` e implementá-las em um service handler. Isso **não funciona bem** para um MCP server porque:

- O CAP adiciona prefixos de namespace nas rotas (`/odata/v4/McpService/health` em vez de `/mcp/health`)
- O protocolo MCP espera rotas simples e controle total do formato de resposta
- O CAP serializa respostas OData, não JSON puro

**Solução:** usar o hook `cds.on('bootstrap', app => ...)` para registrar rotas Express diretamente, mantendo o CAP apenas como framework de inicialização.

### 2. Adicionar `express.json()` manualmente

O CAP não registra o middleware de parsing de JSON para rotas customizadas. Sem ele, `req.body` chega `undefined` e o campo `tool` não é lido — gerando erro 400 mesmo com o body correto.

**Solução:** adicionar no início do handler:

```js
app.use(require('express').json())
```

### 3. O arquivo .cds não pode ser removido

O CAP exige ao menos um arquivo `.cds` válido para inicializar. Sem ele, o servidor não sobe.

**Solução:** manter um `DummyService` mínimo no `.cds` como placeholder.

### 4. API Key nunca no repositório

O `manifest.yml` vai para o repositório com `SAP_API_KEY: ""` vazio. A chave real é configurada via `cf set-env` após o deploy e fica apenas no ambiente do CF.

---

## Uso com Claude Desktop (MCP Client)

Adicione no `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sap-maintenance": {
      "url": "https://<sua-app>.cfapps.us10-001.hana.ondemand.com"
    }
  }
}
```

Após configurar, o Claude Desktop reconhece as tools e você pode perguntar diretamente:
> *"Liste as últimas ordens de manutenção da planta 1710"*

---

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `SAP_API_KEY` | API Key do SAP Business Accelerator Hub | *(obrigatório)* |
| `SAP_API_BASE` | URL base da API OData | sandbox S/4HANA |
