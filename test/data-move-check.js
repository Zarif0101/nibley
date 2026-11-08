// Learner data move check (Zarif 2026-11-08: learner data lives inside the app). An old install with settings.vaultPath
// starts once: its vault/nibley folder is copied into the app's data folder, the old copy stays, vaultPath leaves settings.
// Run: npx electron test/data-move-check.js
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-move-'));
const OLD = path.join(TMP, 'old-vault'), NEW = path.join(TMP, 'appdata');
fs.mkdirSync(path.join(OLD, 'nibley', 'lessons', '2026-11-01-test'), { recursive: true });
fs.writeFileSync(path.join(OLD, 'nibley', 'about-me.md'), '# About me\n- Studies physics\n');
fs.writeFileSync(path.join(OLD, 'nibley', 'lessons', '2026-11-01-test', 'meta.json'), '{"title":"Test lesson"}');
const SET = path.join(TMP, 'settings.json');
fs.writeFileSync(SET, JSON.stringify({ vaultPath: OLD, dataPath: NEW, mode: 'ask', pendingQuestion: null, ear: false }));
process.env.NIBLEY_FAKE = '1';
process.env.NIBLEY_SETTINGS = SET;

const { app } = require('electron');
const main = require('../src/main');

const results = [];
const check = (name, pass, detail = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };

main.ready.then(() => {
  const moved = path.join(NEW, 'nibley');
  check('about-me copied into the app folder', fs.readFileSync(path.join(moved, 'about-me.md'), 'utf8').includes('Studies physics'));
  check('lesson folder copied', fs.existsSync(path.join(moved, 'lessons', '2026-11-01-test', 'meta.json')));
  check('old vault copy left alone', fs.existsSync(path.join(OLD, 'nibley', 'about-me.md')));
  const saved = JSON.parse(fs.readFileSync(SET, 'utf8'));
  check('vaultPath removed from settings', !('vaultPath' in saved), JSON.stringify(Object.keys(saved)));
  console.log(`\n${results.filter(Boolean).length}/${results.length} pass`);
  app.exit(0);
}).catch((e) => { console.error('DATA MOVE CHECK CRASH', e); app.exit(1); });
