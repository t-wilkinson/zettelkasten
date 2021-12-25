const fs = require('fs')

const path = process.argv[2] || './test'
if (!fs.existsSync(path)) {
  fs.mkdirSync(path)
}

module.exports = {
  path, // Default notes directory
}
