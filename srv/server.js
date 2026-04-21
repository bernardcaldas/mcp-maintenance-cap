const cds = require('@sap/cds')

cds.on('bootstrap', (app) => {
    require('./mcp-handler')(app)
})

module.exports = cds.server
