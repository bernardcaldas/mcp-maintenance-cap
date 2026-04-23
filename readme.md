# SAP Maintenance Orders — Consulta por Linguagem Natural com IA

> Imagine perguntar ao seu assistente de IA: *"Quais ordens de manutenção estão abertas na planta 1710 com prioridade alta?"* — e receber a resposta direto do SAP, em segundos, sem abrir nenhuma transação.

**É exatamente isso que este projeto faz.**

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)
![SAP BTP](https://img.shields.io/badge/SAP%20BTP-Cloud%20Foundry-0070F2?logo=sap&logoColor=white)
![SAP CAP](https://img.shields.io/badge/SAP%20CAP-8.x-0070F2?logo=sap&logoColor=white)
![Status](https://img.shields.io/badge/status-live%20on%20BTP-brightgreen)

---

## Demo

<!-- GIF coming soon -->
> GIF demonstrating Claude Desktop querying SAP maintenance orders in natural language — coming soon.

**Questions used in the demo:**

> *"Is there any order related to a leak? What is planned to fix it?"*

> *"I have a meeting now about the EDDY Pumps. Give me a quick summary of all open orders for them."*

Both answered in seconds — no SAP transaction opened, no filter configured, no technical knowledge required.

---

## O Problema que Resolve

Gestores de manutenção, coordenadores e técnicos de campo precisam de informações do SAP diariamente — status de ordens, prioridades, histórico de equipamentos. Para isso, precisam:

- Ter acesso ao SAP GUI ou Fiori
- Conhecer a transação correta (IW38, IW39...)
- Saber filtrar e navegar pelas telas

**Resultado:** informação travada atrás de um sistema complexo, dependência de perfis técnicos para consultas simples, tempo perdido.

Com este projeto, qualquer pessoa com acesso ao assistente de IA pode consultar esses dados em linguagem natural — sem treinamento no SAP, sem navegar em telas.

---

## Como Funciona

```mermaid
flowchart LR
    A[Usuário] -->|pergunta em português| B[Claude Desktop]
    B -->|stdio MCP| C[mcp-stdio.js local]
    C -->|HTTP POST /mcp/call| D[MCP Server no SAP BTP]
    D -->|consulta OData| E[SAP S/4HANA]
    E -->|dados reais| D
    D -->|JSON estruturado| C
    C -->|resposta MCP| B
    B -->|responde em português| A
```

A arquitetura tem duas camadas:
- **`mcp-stdio.js`** — roda localmente, faz a ponte entre o Claude Desktop (protocolo MCP stdio) e o servidor no BTP
- **MCP Server no BTP** — hospedado no SAP BTP Cloud Foundry, consulta a API OData do SAP S/4HANA

---

## Exemplos de Perguntas que Já Funcionam

```
"Is there any order related to a leak? What is planned to fix it?"

"I have a meeting now about the EDDY Pumps. Give me a quick summary of all open orders for them."

"Which orders have priority 1 in plant 1010?"

"Equipment 10001949 — does it have more than one open order? Show me all of them."

"What is the detailed status of order 4000300?"
```

---

## O que Pode Ser Construído com Essa Abordagem

Este projeto é uma prova de conceito funcional e serve de base para soluções reais. Com a mesma arquitetura é possível integrar:

| Módulo SAP | O que a IA poderia responder |
|------------|------------------------------|
| **PM** — Plant Maintenance | Ordens, equipamentos, histórico de falhas |
| **MM** — Materials Management | Estoque, pedidos de compra, fornecedores |
| **SD** — Sales & Distribution | Pedidos de venda, entregas, faturamento |
| **QM** — Quality Management | Inspeções, notificações de qualidade |
| **FI/CO** — Financeiro | Centros de custo, lançamentos, relatórios |

---

## Serviços que Ofereço

Se você é de uma consultoria SAP ou empresa que quer explorar essa capacidade:

- **Prova de conceito** — MCP Server funcional integrado ao seu módulo SAP em poucos dias
- **Integração com Claude Desktop, Copilot ou outros clientes MCP** — o usuário final usa a IA que já conhece
- **Deploy no SAP BTP ou infraestrutura do cliente** — seguro, sem dados saindo do ambiente controlado
- **Expansão para múltiplos módulos** — uma vez que a arquitetura está pronta, adicionar novos dados é rápido

> Interessado? Entre em contato: **bernardo.acaldas@gmail.com**

---

## Evidências do Projeto em Produção

> **Adicionar aqui:** Screenshot do `cf apps` mostrando a app `running` no BTP.

<!-- ![BTP Running](docs/btp-running.png) -->

> **Adicionar aqui:** Screenshot do health check respondendo na URL pública.

<!-- ![Health Check](docs/health-check.png) -->

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Framework | SAP CAP (Cloud Application Programming) |
| Servidor | Node.js + Express |
| Protocolo | MCP (Model Context Protocol) |
| API SAP | OData REST via SAP Business Accelerator Hub |
| Hospedagem | SAP BTP Cloud Foundry |
| Cliente IA | Claude Desktop (Anthropic) |

---

## Rodar Localmente

```bash
git clone https://github.com/bernardcaldas/mcp-maintenance-cap.git
cd mcp-maintenance-cap
npm install
npm run dev
```

Testar:

```bash
curl -X POST http://localhost:4004/mcp/call \
  -H "Content-Type: application/json" \
  -d '{"tool": "get_maintenance_orders", "input": {"top": 3}}'
```

---

## Deploy no SAP BTP

```bash
cf login -a https://api.cf.us10-001.hana.ondemand.com
cf push mcp-maintenance-cap
cf set-env mcp-maintenance-cap SAP_API_KEY "sua-chave-aqui"
cf restart mcp-maintenance-cap
```

A API Key é obtida gratuitamente no [SAP Business Accelerator Hub](https://api.sap.com).

---

## Conectar ao Claude Desktop

O Claude Desktop se comunica via protocolo **MCP stdio** (JSON-RPC 2.0). Como o servidor principal roda no BTP via HTTP, este repositório inclui o arquivo `mcp-stdio.js` — um proxy local que faz a ponte entre os dois.

**Passo 1 — garantir que o app está rodando no BTP:**

```bash
cf start mcp-maintenance-cap
```

**Passo 2 — configurar o Claude Desktop.**

Abra `%APPDATA%\Claude\claude_desktop_config.json` e adicione a entrada `sap-maintenance`:

```json
{
  "mcpServers": {
    "sap-maintenance": {
      "command": "node",
      "args": [
        "C:\\caminho\\para\\mcp-maintenance-cap\\mcp-stdio.js"
      ]
    }
  }
}
```

**Passo 3 — reiniciar o Claude Desktop.** O ícone de ferramentas (hammer) aparecerá indicando que o servidor MCP foi carregado.

**Exemplos de perguntas que funcionam depois da conexão:**

```
"Tenho uma reunião agora sobre os EDDY PUMPs. Me dê um resumo das ordens abertas."

"Quais ordens são de prioridade 1 na planta 1010?"

"O equipamento 10001949 tem mais de uma ordem aberta? Me mostre todas."

"Existe alguma ordem relacionada a vazamento? O que está planejado?"

"Qual o status detalhado da ordem 4000300?"
```

---

<details>
<summary><strong>Lições Aprendidas (referência técnica)</strong></summary>

### 1. Não usar CDS service para expor rotas MCP
O CAP adiciona prefixos OData nas rotas e serializa respostas no formato OData — incompatível com o protocolo MCP. A solução foi registrar rotas Express diretamente via `cds.on('bootstrap', app => ...)`.

### 2. Adicionar `express.json()` manualmente
O CAP não registra esse middleware para rotas customizadas. Sem ele, `req.body` chega `undefined` mesmo com `Content-Type: application/json` no header.

### 3. Manter um arquivo .cds válido
O CAP exige ao menos um `.cds` para inicializar. Solução: `DummyService` mínimo como placeholder.

### 4. API Key fora do repositório
`manifest.yml` vai para o repo com `SAP_API_KEY: ""`. A chave real é configurada via `cf set-env` após o deploy.

### 5. Claude Desktop não suporta HTTP direto — precisa de proxy stdio
O Claude Desktop se comunica com servidores MCP exclusivamente via **stdio** (processo local, JSON-RPC 2.0 por stdin/stdout). Não é possível apontar diretamente para uma URL HTTP no `claude_desktop_config.json`. A solução foi criar `mcp-stdio.js`: um script Node.js leve que o Claude Desktop spawna localmente e que encaminha cada chamada de tool para o endpoint `/mcp/call` do servidor no BTP. Dessa forma o servidor deployado não precisa mudar.

### 6. Protocolo MCP requer métodos específicos
O handshake do Claude Desktop espera três métodos em sequência: `initialize` (negociação de versão e capacidades), `tools/list` (schema de cada tool) e `tools/call` (execução). O servidor HTTP original expunha apenas rotas REST customizadas — o `mcp-stdio.js` implementa esses três métodos e traduz para chamadas HTTP ao BTP.

</details>
