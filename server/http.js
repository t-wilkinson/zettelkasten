const fs = require('fs')
const glob = require('glob')
const path = require('path')
const { readFile } = require('fs/promises')

const http = require('koa-router')()
const config = require('./config')

async function getFile(fileName) {
  const fileBody = await readFile(fileName, 'utf8')
  return {
    body: fileBody,
    name: path.relative(config.notesDir, fileName),
  }
}

http.get('/zettels', async ctx => {
  const fileNames = glob.sync(`${config.notesDir}/**/*.zettel`)
  ctx.body = await Promise.all(fileNames.map(getFile))
  ctx.set('Content-Type', 'application/json')
})

http.get('/zettels/:filename', async ctx => {
  const fileNames = glob.sync(`${config.notesDir}/**/${ctx.params.filename}`)
  if (fileNames.length === 0) {
    ctx.status = 404
    return
  }
  ctx.body = await getFile(fileNames[0])
  ctx.set('Content-Type', 'application/json')
})

http.put('/zettels/:filename', async ctx => {
  const { filename } = ctx.params
  fs.writeFileSync(`${config.notesDir}/${filename}`, ctx.request.body)
  ctx.body = null
})

module.exports = http
