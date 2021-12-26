const Koa = require('koa')
const WebSocket = require('koa-websocket')
const staticFileServer = require('koa-static')
const mount = require('koa-mount')
const path = require('path')
const config = require('./config')

const app = new Koa()
const socket = WebSocket(app)
const bodyParser = require('koa-bodyparser')
const staticFiles = require('koa-router')()

app.on('error', err => {
  console.error('server error', err)
})

app.use(async (ctx, next) => {
  const start = new Date().getTime()
  await next()
  const end = new Date().getTime()
  console.info(`${ctx.method} ${ctx.url} - ${end - start}ms`)
})

app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*')
  ctx.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  ctx.set('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS')
  await next()
})

// Static file server
app.use(mount('/files', (ctx, next) => {
  ctx.request.path = path.relative(config.staticFileDir, ctx.request.path)
  return staticFileServer(config.staticFileDir)(ctx, next)
}))

// prettier-ignore
app
  .use(staticFiles.routes())
  .use(staticFiles.allowedMethods())

const http = require('./http')
// prettier-ignore
app
  .use(bodyParser({ enableTypes: ['text', 'plain', 'json']}))
  .use(http.routes())
  .use(http.allowedMethods())

const ws = require('./ws')
// prettier-ignore
app.ws
  .use(ws.routes())
  .use(ws.allowedMethods())

const port = 4000
console.info(`Listening on port ${port}`)
app.listen(port)
