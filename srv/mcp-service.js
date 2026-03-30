require('dotenv').config()
const cds = require('@sap/cds')
const axios = require('axios')

const SAP_API_BASE = process.env.SAP_API_BASE
const SAP_API_KEY = process.env.SAP_API_KEY

const sapClient = axios.create({
    baseURL: SAP_API_BASE,
    headers: { APIKey: SAP_API_KEY, Accept: 'application/json' },
    timeout: 30000
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildFilter(p) {
    const f = []
    if (p.plant) f.push(`Plant eq '${p.plant}'`)
    if (p.orderType) f.push(`MaintenanceOrderType eq '${p.orderType}'`)
    if (p.equipment) f.push(`Equipment eq '${p.equipment}'`)
    if (p.functionalLocation) f.push(`FunctionalLocation eq '${p.functionalLocation}'`)
    return f.join(' and ') || null
}

function formatOrder(o) {
    return {
        maintenanceOrder: o.MaintenanceOrder,
        description: o.MaintenanceOrderDesc,
        orderType: o.MaintenanceOrderType,
        plant: o.MaintenancePlant,
        equipment: o.Equipment,
        equipmentName: o.EquipmentName,
        functionalLocation: o.FunctionalLocation,
        systemStatus: o.SystemStatusText,
        priority: o.MaintPriority,
        startDate: o.MaintOrdBasicStartDate,
        endDate: o.MaintOrdBasicEndDate,
        workCenter: o.MainWorkCenter,
        activityType: o.MaintenanceActivityType,
        companyCode: o.CompanyCode,
        costCenter: o.CostCenter,
    }
}

// ── Tools ────────────────────────────────────────────────────────────────────

async function getMaintenanceOrders(p) {
    const params = {
        $top: Math.min(parseInt(p.top) || 3, 50),
    }

    const res = await sapClient.get('/MaintenanceOrder', { params })
    const orders = res.data?.d?.results || []
    return { total: orders.length, orders: orders.map(formatOrder) } // retorna só o primeiro pra ver os campos
}

async function getMaintenanceOrderDetail(p) {
    if (!p.maintenanceOrder) throw new Error("Parâmetro 'maintenanceOrder' obrigatório.")
    const id = String(p.maintenanceOrder).padStart(12, '0')
    const res = await sapClient.get(`/MaintenanceOrder('${id}')`)
    const o = res.data?.d
    if (!o) return { message: 'Ordem não encontrada.' }
    return { order: formatOrder(o) }
}

async function getMaintenanceOrderOperations(p) {
    if (!p.maintenanceOrder) throw new Error("Parâmetro 'maintenanceOrder' obrigatório.")
    const id = String(p.maintenanceOrder).padStart(12, '0')
    const res = await sapClient.get('/MaintenanceOrderOperation', {
        params: {
            $filter: `MaintenanceOrder eq '${id}'`,
            $top: Math.min(parseInt(p.top) || 20, 100),
            $select: 'MaintenanceOrder,MaintenanceOrderOperation,OperationDescription,Plant,OperationWorkCenter,OpPlannedWorkQuantity,SystemStatus'
        }
    })
    const ops = res.data?.d?.results || []
    return { total: ops.length, operations: ops }
}

// ── Router ───────────────────────────────────────────────────────────────────

const TOOLS = {
    get_maintenance_orders: getMaintenanceOrders,
    get_maintenance_order_detail: getMaintenanceOrderDetail,
    get_maintenance_order_operations: getMaintenanceOrderOperations,
}

const TOOLS_META = Object.keys(TOOLS).map(name => ({ name }))

// ── CAP Service ──────────────────────────────────────────────────────────────

module.exports = cds.service.impl(async function () {

    this.on('health', () => JSON.stringify({
        status: 'ok',
        service: 'mcp-maintenance-cap',
        tools: Object.keys(TOOLS),
        timestamp: new Date().toISOString()
    }))

    this.on('tools', () => JSON.stringify({ tools: TOOLS_META }))

    this.on('call', async (req) => {
        const { tool, input } = req.data
        const handler = TOOLS[tool]

        if (!handler) {
            req.error(404, `Tool '${tool}' não encontrada. Disponíveis: ${Object.keys(TOOLS).join(', ')}`)
            return
        }

        try {
            const params = JSON.parse(input || '{}')
            const result = await handler(params)
            return JSON.stringify(result)
        } catch (err) {
            const msg = err.response?.data?.error?.message?.value || err.message
            req.error(500, msg)
        }
    })
})