// Picks the platform. Only files in src/platform/ may touch the OS directly.
if (process.env.NIBLEY_FAKE) module.exports = require('./fake');
else if (process.platform === 'win32') module.exports = require('./windows');
else throw new Error('Nibley v1 runs on Windows only (see docs/SWITCHING-PLAN.md).');
