#!/usr/bin/env node
'use strict'

const https = require('https')
const rl    = require('readline').createInterface({ input: process.stdin })

const BTP_URL = process.env.BTP_URL || 'https://mcp-maintenance-cap.cfapps.us10-001.hana.ondemand.com'

function httpPost(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body)
        const url  = new URL(path, BTP_URL)
        const req  = https.request(url, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
        }, res => {
            let raw = ''
            res.on('data', c => raw += c)
            res.on('end', () => {
                try { resolve(JSON.parse(raw)) }
                catch { resolve({ error: raw }) }
            })
        })
        req.on('error', reject)
        req.write(data)
        req.end()
    })
}

const TOOL_DEFS = [
    {
        name: 'get_maintenance_orders',
        description: 'Lista ordens de manutenção do SAP S/4HANA com filtros opcionais.',
        inputSchema: {
            type: 'object',
            properties: {
                plant:              { type: 'string', description: 'Planta de manutenção (ex: 1710)' },
                orderType:          { type: 'string', description: 'Tipo de ordem (ex: YA01, YA02)' },
                equipment:          { type: 'string', description: 'Número do equipamento' },
                functionalLocation: { type: 'string', description: 'Localização funcional' },
                top:                { type: 'number', description: 'Quantidade máxima de registros (padrão 10, máx 50)' },
            },
        },
    },
    {
        name: 'get_maintenance_order_detail',
        description: 'Retorna o detalhe completo de uma ordem de manutenção específica.',
        inputSchema: {
            type: 'object',
            required: ['maintenanceOrder'],
            properties: {
                maintenanceOrder: { type: 'string', description: 'Número da ordem (ex: 4000300)' },
            },
        },
    },
    {
        name: 'get_maintenance_order_operations',
        description: 'Lista as operações planejadas de uma ordem de manutenção.',
        inputSchema: {
            type: 'object',
            required: ['maintenanceOrder'],
            properties: {
                maintenanceOrder: { type: 'string', description: 'Número da ordem (ex: 4000291)' },
                top:              { type: 'number', description: 'Quantidade máxima de operações (padrão 20)' },
            },
        },
    },
]

function send(msg) {
    process.stdout.write(JSON.stringify(msg) + '\n')
}

async function handle(msg) {
    const { id, method, params } = msg

    if (method === 'initialize') {
        return send({ jsonrpc: '2.0', id, result: {
            protocolVersion: '2024-11-05',
            serverInfo: { name: 'sap-maintenance', version: '1.0.0' },
            capabilities: { tools: {} },
        }})
    }

    if (method === 'notifications/initialized') return

    if (method === 'tools/list') {
        return send({ jsonrpc: '2.0', id, result: { tools: TOOL_DEFS } })
    }

    if (method === 'tools/call') {
        const { name, arguments: args } = params || {}
        try {
            const btpRes = await httpPost('/mcp/call', { tool: name, input: args || {} })
            if (btpRes.error) {
                return send({ jsonrpc: '2.0', id, result: {
                    content: [{ type: 'text', text: `Erro SAP: ${btpRes.error}` }],
                    isError: true,
                }})
            }
            return send({ jsonrpc: '2.0', id, result: btpRes })
        } catch (e) {
            return send({ jsonrpc: '2.0', id, result: {
                content: [{ type: 'text', text: `Erro de conexão: ${e.message}` }],
                isError: true,
            }})
        }
    }

    send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Método '${method}' não suportado.` } })
}

rl.on('line', line => {
    line = line.trim()
    if (!line) return
    let msg
    try { msg = JSON.parse(line) } catch { return }
    handle(msg).catch(e => process.stderr.write(e.message + '\n'))
})
