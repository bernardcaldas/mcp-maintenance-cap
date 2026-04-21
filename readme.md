# SAP Maintenance Orders — Consulta por Linguagem Natural com IA

> Imagine perguntar ao seu assistente de IA: *"Quais ordens de manutenção estão abertas na planta 1710 com prioridade alta?"* — e receber a resposta direto do SAP, em segundos, sem abrir nenhuma transação.

**É exatamente isso que este projeto faz.**

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)
![SAP BTP](https://img.shields.io/badge/SAP%20BTP-Cloud%20Foundry-0070F2?logo=sap&logoColor=white)
![SAP CAP](https://img.shields.io/badge/SAP%20CAP-8.x-0070F2?logo=sap&logoColor=white)
![Status](https://img.shields.io/badge/status-live%20on%20BTP-brightgreen)

---

## Demo

> **Adicionar aqui:** GIF ou vídeo curto mostrando o Claude Desktop consultando ordens de manutenção em linguagem natural.

<!-- Exemplo do que colocar:
![Demo](docs/demo.gif)
-->

> **Adicionar aqui:** Screenshot da resposta real retornada (Postman ou Claude Desktop).

<!-- Exemplo:
![Postman](docs/postman-response.png)
-->

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
    B -->|chama tool MCP| C[MCP Server no SAP BTP]
    C -->|consulta OData| D[SAP S/4HANA]
    D -->|dados reais| C
    C -->|resposta estruturada| B
    B -->|responde em português| A
```

O servidor MCP fica hospedado no **SAP BTP Cloud Foundry** e funciona como uma ponte: recebe perguntas da IA, consulta a API do SAP e devolve os dados formatados.

---

## Exemplos de Perguntas que Já Funcionam

```
"Liste as últimas 5 ordens de manutenção da planta 1710"

"Qual o status da ordem 4000300?"

"Mostre as operações planejadas para a ordem 4000291"

"Quais ordens do tipo YA02 estão abertas?"

"Detalhe a ordem de manutenção do equipamento 217100091"
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

Adicione no `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sap-maintenance": {
      "url": "https://mcp-maintenance-cap.cfapps.us10-001.hana.ondemand.com"
    }
  }
}
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

</details>
