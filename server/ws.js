const chokidar = require('chokidar')
const Path = require('path')
const config = require('./config')

const ws = require('koa-router')()

ws.get('/changes', async ctx => {
  const watcher = chokidar.watch(`${config.notesDir}/*.zettel`)
  // watcher.on('all', (event, path) => event !== 'add' && console.log(event, path))
  watcher.on('change', path => ctx.websocket.send(Path.relative(config.notesDir, path)))
  watcher.on('unlink', path => ctx.websocket.send(Path.relative(config.notesDir, path)))

  // const watchDir = chokidar.watch(`${config.notesDir}`)
  // watchDir.on('all', (event, path) => console.log(event, path))

  ctx.websocket.on('close', () => {
    watcher.close()
  })
})

module.exports = ws
