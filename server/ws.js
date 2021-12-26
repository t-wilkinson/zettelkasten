const chokidar = require('chokidar')
const Path = require('path')
const config = require('./config')

const ws = require('koa-router')()

ws.get('/changes', async ctx => {
  const watcher = chokidar.watch(`${config.notesDir}/**/*.zettel`)
  // why does add event fire on file read?
  // watcher.on('add', path => ctx.websocket.send(Path.relative('./test', path)))
  watcher.on('change', path => ctx.websocket.send(Path.relative(config.notesDir, path)))
  // watcher.on('unlink', path => ctx.websocket.send(Path.relative('./test', path)))

  ctx.websocket.on('close', () => {
    watcher.close()
  })
})

module.exports = ws
