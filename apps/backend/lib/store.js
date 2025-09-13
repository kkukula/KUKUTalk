const fs = require('fs')
const path = require('path')

const DATA_PATH = path.join(__dirname, '..', 'data', 'users.json')

function readJson() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8')
  return JSON.parse(raw)
}

function writeJson(obj) {
  const tmp = DATA_PATH + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8')
  fs.renameSync(tmp, DATA_PATH)
}

module.exports = { DATA_PATH, readJson, writeJson }
