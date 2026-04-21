const axios = require('axios')

const SAP_API_BASE = process.env.SAP_API_BASE || 'https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_MAINTENANCEORDER'
const SAP_API_KEY  = process.env.SAP_API_KEY  || ''

const sapClient = axios.create({
    baseURL: SAP_API_BASE,
    headers: { APIKey: SAP_API_KEY, Accept: 'application/json' },
    timeout: 30000
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildFilter(p) {
    const f = []
    if (p.plant)             f.push(`MaintenancePlant eq '${p.plant}'`)
    if (p.orderType)         f.push(`MaintenanceOrderType eq '${p.orderType}'`)
    if (p.equipment)         f.push(`Equipment eq '${p.equipment}'`)
    if (p.functionalLocation) f.push(`FunctionalLocation eq '${p.functionalLocation}'`)
    return f.join(' and ') || null
}

function formatOrder(o) {
    return {
        maintenanceOrder:    o.MaintenanceOrder,
        description:         o.MaintenanceOrderDesc,
        orderType:           o.MaintenanceOrderType,
        plant:               o.MaintenancePlant,
        equipment:           o.Equipment,
        equipmentName:       o.EquipmentName,
        functionalLocation:  o.FunctionalLocation,
        systemStatus:        o.SystemStatusText,
        priority:            o.MaintPriority,
        startDate:           o.MaintOrdBasicStartDate,
        endDate:             o.MaintOrdBasicEndDate,
        workCenter:          o.MainWorkCenter,
        activityType:        o.MaintenanceActivityType,
        companyCode:         o.CompanyCode,
        costCenter:          o.CostCenter,
    }
}

// ── Tools ─────────────────────────────────────────────────────────────────────

async function getMaintenanceOrders(p) {
    const params = {
        $top:     Math.min(parseInt(p.top) || 10, 50),
        $orderby: 'MaintenanceOrder desc',
        $select:  'MaintenanceOrder,MaintenanceOrderDesc,MaintenanceOrderType,MaintenancePlant,Equipment,EquipmentName,FunctionalLocation,SystemStatusText,MaintPriority,MaintOrdBasicStartDate,MaintOrdBasicEndDate,MainWorkCenter,MaintenanceActivityType,CompanyCode,CostCenter'
    }
    const filter = buildFilter(p)
    if (filter) params.$filter = filter
    const res = await sapClient.get('/MaintenanceOrder', { params })
    const orders = res.data?.d?.results || []
    return { total: orders.length, orders: orders.map(formatOrder) }
}

async function getMaintenanceOrderDetail(p) {
    if (!p.maintenanceOrder) throw new Error("Parâmetro 'maintenanceOrder' obrigatório.")
    const id  = String(p.maintenanceOrder).padStart(12, '0')
    const res = await sapClient.get(`/MaintenanceOrder('${id}')`)
    const o   = res.data?.d
    if (!o) return { message: 'Ordem não encontrada.' }
    return { order: formatOrder(o) }
}

async function getMaintenanceOrderOperations(p) {
    if (!p.maintenanceOrder) throw new Error("Parâmetro 'maintenanceOrder' obrigatório.")
    const id  = String(p.maintenanceOrder).padStart(12, '0')
    const res = await sapClient.get('/MaintenanceOrderOperation', {
        params: {
            $filter: `MaintenanceOrder eq '${id}'`,
            $top:    Math.min(parseInt(p.top) || 20, 100),
            $select: 'MaintenanceOrder,MaintenanceOrderOperation,OperationDescription,Plant,OperationWorkCenter,OpPlannedWorkQuantity,SystemStatus'
        }
    })
    const ops = res.data?.d?.results || []
    return { total: ops.length, operations: ops }
}

const TOOLS = {
    get_maintenance_orders:           getMaintenanceOrders,
    get_maintenance_order_detail:     getMaintenanceOrderDetail,
    get_maintenance_order_operations: getMaintenanceOrderOperations,
}

// ── Express routes ────────────────────────────────────────────────────────────

module.exports = function (app) {

    app.use(require('express').json())

    app.get('/mcp/health', (_req, res) => {
        res.json({
            status:    'ok',
            service:   'mcp-maintenance-cap',
            tools:     Object.keys(TOOLS),
            timestamp: new Date().toISOString()
        })
    })

    app.get('/mcp/tools', (_req, res) => {
        res.json({ tools: Object.keys(TOOLS).map(name => ({ name })) })
    })

    app.post('/mcp/call', async (req, res) => {
        const { tool, input } = req.body || {}
        const handler = TOOLS[tool]

        if (!handler) {
            return res.status(400).json({
                error: `Tool '${tool}' não encontrada. Disponíveis: ${Object.keys(TOOLS).join(', ')}`
            })
        }

        try {
            const params = typeof input === 'string' ? JSON.parse(input) : (input || {})
            const result = await handler(params)
            res.json({ content: [{ type: 'text', text: JSON.stringify(result) }] })
        } catch (err) {
            const msg = err.response?.data?.error?.message?.value || err.message
            res.status(500).json({ error: msg })
        }
    })
}
