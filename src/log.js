// One JSON line per event in logs/nibley-YYYY-MM-DD.log (BUILD-PLAN 4.13).
const fs = require('node:fs');
const path = require('node:path');

// Test runs (they set NIBLEY_SETTINGS) log to logs/test/, so the scorecard reads real study sessions only.
const dir = path.join(__dirname, '..', 'logs', ...(process.env.NIBLEY_SETTINGS ? ['test'] : []));
fs.mkdirSync(dir, { recursive: true });

function log(obj) {
  const file = path.join(dir, `nibley-${new Date().toLocaleDateString('sv')}.log`);
  fs.appendFile(file, JSON.stringify({ t: new Date().toISOString(), ...obj }) + '\n', () => {});
}

module.exports = { log, dir };
