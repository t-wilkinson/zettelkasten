const Koa = require('koa')
const WebSocket = require('koa-websocket')

const app = new Koa()
const socket = WebSocket(app)
const bodyParser = require('koa-bodyparser')

app.on('error', err => {
  console.error('server error', err)
})

app.use(async (ctx, next) => {
  await next()
  const rt = ctx.response.get('X-Response-Time')
  console.info(`${ctx.method} ${ctx.url} - ${rt}`)
})

app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*')
  ctx.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  ctx.set('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS')
  await next()
})

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
