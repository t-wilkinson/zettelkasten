const Koa = require('koa')
const Router = require('@koa/router')
const glob = require('glob')
const { readFile } = require('fs/promises')
const path = require('path')
const bodyParser = require('koa-bodyparser')
const fs = require('fs')

const app = new Koa()
const router = new Router()

const zettelkastenDir = process.argv[2]

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

app.on('error', err => {
  console.error('server error', err)
})

router.get('/zettels', async ctx => {
  const fileNames = glob.sync(`${zettelkastenDir}/**/*.zettel`)
  const files = await Promise.all(
    fileNames.map(async fileName => {
      const fileBody = await readFile(fileName, 'utf8')
      return {
        body: fileBody,
        name: path.relative(zettelkastenDir, fileName),
      }
    })
  )

  ctx.body = files
  ctx.set('Content-Type', 'application/json')
})

router.put('/zettels/:filename', async ctx => {
  const { filename } = ctx.params
  fs.writeFileSync(`./test+${filename}`, ctx.request.body)
  ctx.body = null
})

// prettier-ignore
app
  .use(bodyParser({ enableTypes: ['text', 'plain', 'json']}))
  .use(router.routes())
  .use(router.allowedMethods())

const port = 4000
console.info(`Listening on port ${port}`)
app.listen(port)
