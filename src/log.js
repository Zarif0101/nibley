// One JSON line per event in logs/nibley-YYYY-MM-DD.log (BUILD-PLAN 4.13).
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..', 'logs');
fs.mkdirSync(dir, { recursive: true });

function log(obj) {
  const file = path.join(dir, `nibley-${new Date().toLocaleDateString('sv')}.log`);
  fs.appendFile(file, JSON.stringify({ t: new Date().toISOString(), ...obj }) + '\n', () => {});
}

module.exports = { log, dir };
