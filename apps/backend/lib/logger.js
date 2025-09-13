const pino = require('pino-http')

function redactBody(obj){
  try{
    if (!obj) return undefined
    const clone = {}
    const allowed = ['email','path','method','status']
    for (const k of Object.keys(obj)) {
      const v = obj[k]
      if (typeof v === 'string' && v.length > 120) continue
      if (k.toLowerCase().indexOf('password') !== -1) { clone[k] = '***' }
      else if (k.length <= 40) { clone[k] = v }
    }
    return clone
  } catch(e) { return undefined }
}

function createLogger(){
  return pino({
    autoLogging: { ignorePaths: ['/health'] },
    serializers: {
      req(req) { return { method:req.method, url:req.url } },
      res(res) { return { statusCode: res.statusCode } }
    },
    redact: { paths: ['req.headers.authorization'], remove: true },
    quietReqLogger: true
  })
}

module.exports = { createLogger, redactBody }
