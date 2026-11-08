// "Now studying" live check (docs/NEXT-ROUND.md phase 1 step 5): opens 3 sources in Brave (a YouTube lecture, a course
// site, a PDF), then reads the source line 3 times each with the real helper, like 3 questions. Target: right 9/9.
// The YouTube time is read from Brave's window (no extension), like the app does.
// Run: node test/source-check.js   (opens 3 Brave tabs; it can't close them: no keys are sent)
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const platform = require('../src/platform');
const youtube = require('../src/youtube');
const { sourceLine } = require('../src/source');

const settings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'settings.json'), 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SOURCES = [
  { name: 'YouTube lecture', url: 'https://www.youtube.com/watch?v=ZK3O402wf1c&t=300s', ok: (l) => /youtube\.com\/watch\?v=ZK3O402wf1c/.test(l) && /\| \d+:\d\d of \d+:\d\d:?\d*\]$/.test(l) },
  { name: 'course site', url: 'https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/', ok: (l) => /ocw\.mit\.edu\/courses\/18-06/.test(l) && /linear algebra/i.test(l) },
  { name: 'PDF', url: 'https://arxiv.org/pdf/1706.03762', ok: (l) => /arxiv\.org\/pdf\/1706\.03762/.test(l) },
];

(async () => {
  await platform.start();
  const vault = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-src-'));
  await youtube.start({ platform, vaultPath: vault });
  let pass = 0;
  const only = process.argv[2]; // e.g. "YouTube": run one source again
  for (const s of SOURCES.filter((x) => !only || x.name.includes(only))) {
    await platform.openUrl(s.url);
    await sleep(9000); // page load
    await youtube.poll();
    for (let q = 1; q <= 3; q++) {
      const t0 = Date.now();
      const fg = await platform.foreground();
      const url = /^(brave|chrome|msedge)$/i.test(fg.exe) ? await platform.browserUrl() : '';
      const line = sourceLine({ ...fg, url }, youtube.current());
      const ok = fg.exe === 'brave' && !!line && s.ok(line);
      pass += ok;
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${s.name} q${q}  ${Date.now() - t0} ms  ${line}`);
      await sleep(2000);
    }
  }
  console.log(`\n${pass}/${only ? 3 : 9} right`);
  youtube.stop();
  fs.rmSync(vault, { recursive: true, force: true });
  process.exit(0);
})().catch((e) => { console.error('SOURCE CHECK CRASH', e); process.exit(1); });
