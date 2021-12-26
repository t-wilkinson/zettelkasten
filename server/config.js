const fs = require('fs')

const notesDir = process.argv[2] || './test/notes'
if (!fs.existsSync(notesDir)) {
  fs.mkdirSync(notesDir)
}

const staticFileDir = process.argv[3] || './test/static'
if (!fs.existsSync(staticFileDir)) {
  fs.mkdirSync(staticFileDir)
}

module.exports = {
  notesDir, // Default notes directory
  staticFileDir,
}
