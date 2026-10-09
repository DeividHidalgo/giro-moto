// Extracts the inline app script from public/index.html and runs every *.test.js.
// No dependencies: plain Node (>= 18). Tests use an in-memory DOM and a fake Supabase client.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const m = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop();
if (!m) { console.error('inline script not found'); process.exit(1); }
const out = path.join(__dirname, '.build');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'app.js'), m[1]);                       // demo mode (empty config)
fs.writeFileSync(path.join(out, 'app_web.js'),                          // Supabase mode (fake client)
  'window.GIRO_CONFIG={SUPABASE_URL:"https://test.supabase.co",SUPABASE_KEY:"test-key",EMAIL_BASE:"teste@exemplo.com"};\n' + m[1]);
let failed = 0;
for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort()) {
  const r = spawnSync(process.execPath, ['--require', path.join(__dirname, 'freeze-date.js'), path.join(__dirname, f)], { encoding: 'utf8' });
  const last = (r.stdout || '').trim().split('\n').filter(l => /pass|fail|ok/i.test(l)).pop() || '';
  const bad = r.status !== 0 || /FAIL/.test(r.stdout);
  console.log((bad ? 'FAIL ' : 'ok   ') + f + '  ' + last.trim());
  if (bad) { failed++; console.log((r.stdout || '').split('\n').filter(l => /FAIL/.test(l)).join('\n') + (r.stderr || '').slice(0, 500)); }
}
process.exit(failed ? 1 : 0);
