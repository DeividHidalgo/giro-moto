const fs = require('fs');
const path = require('path');
const webcrypto = require('node:crypto').webcrypto;

const els = {};
function el(id) {
  if (!els[id]) {
    els[id] = {
      id, innerHTML: '', textContent: '', hidden: false, value: '', type: '', dataset: {}, _l: {}, _fd: {},
      classList: { add() {}, remove() {}, contains() { return false; } },
      addEventListener(ev, f) { this._l[ev] = f; },
      setAttribute() {}, removeAttribute() {}, focus() {}, select() {},
      checkValidity() { return true; }, reportValidity() {},
      querySelector() { return null; },
    };
  }
  return els[id];
}
el('#sheet').hidden = true; el('#toast').hidden = true; el('#shell').hidden = true; el('#lhint').hidden = true; el('#modo').hidden = true;

const handlers = {};
global.document = {
  querySelector: (s) => el(s), querySelectorAll: () => [],
  addEventListener: (e, f) => { handlers[e] = f; }, activeElement: null, contains: () => true,
  createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage() {} }), toDataURL: (t, q) => 'data:image/jpeg;base64,' + 'A'.repeat(800) }),
};
global.window = { scrollTo() {}, crypto: webcrypto };
global.crypto = webcrypto;
global.navigator = {};
const ss = new Map();
global.sessionStorage = { getItem: (k) => (ss.has(k) ? ss.get(k) : null), setItem: (k, v) => ss.set(k, v), removeItem: (k) => ss.delete(k) };
global.FormData = function (f) { this.forEach = (cb) => Object.keys(f._fd).forEach((k) => cb(f._fd[k], k)); };
global.FileReader = function () { this.readAsDataURL = () => { this.result = 'data:image/png;base64,AA'; setTimeout(() => this.onload(), 0); }; };
global.Image = function () { Object.defineProperty(this, 'src', { set: () => { this.width = 1600; this.height = 1200; setTimeout(() => this.onload(), 0); } }); };

(0, eval)(fs.readFileSync(path.join(__dirname, '.build','app.js'), 'utf8'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const click = (act, extra = {}, sure = false) => handlers.click({ target: { closest: () => ({ dataset: Object.assign({ act }, extra), classList: { contains: () => sure, add() {} }, textContent: '' }) } });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m); } else { fail++; console.log('  FAIL', m); } };
async function login(u, p) { el('#lu').value = u; el('#lp').value = p; await el('#lf')._l.submit({ preventDefault() {} }); await sleep(150); }
async function submitSheet(fd) { el('#f')._fd = fd; el('#f')._l.submit({ preventDefault() {} }); await sleep(400); }
const view = () => strip(el('#view').innerHTML);
const sheet = () => strip(el('#sheet-body').innerHTML);

(async () => {
  await sleep(600); await login('demo','demo1234');
  const pixTxt = () => { const m = el('#view').innerHTML; return m; };
  async function cfg(fd){ click('cfgPix'); await sleep(30); await submitSheet(fd); }
  console.log('Chave Pix por tipo');
  await cfg({ tipo:'celular', chave:'(11) 99999-0000', nome:'Locadora Exemplo', cidade:'Campinas' });
  ok(/Chave …0000/.test(view()), 'celular digitado só com números é aceito');
  click('tab',{tab:'locacoes'}); await sleep(50); click('pagamentos',{id:'ex-l2'}); await sleep(30);
  let code = el('#f-pix').value;
  ok(code.indexOf('0014br.gov.bcb.pix0114+5511999990000')>-1, 'código Pix leva a chave como +55 + DDD + número (14 caracteres)');
  ok(/5802BR5916LOCADORA EXEMPLO6008CAMPINAS/.test(code), 'nome e cidade corretos');
  click('fechar');
  await cfg({ tipo:'celular', chave:'+5511999990000', nome:'Locadora Exemplo', cidade:'Campinas' }); click('fechar');
  click('pagamentos',{id:'ex-l2'}); await sleep(30);
  ok(el('#f-pix').value.indexOf('0114+5511999990000')>-1, 'celular já com +55 não duplica o prefixo'); click('fechar');
  await cfg({ tipo:'celular', chave:'12345', nome:'X', cidade:'Y' }); ok(/Celular inválido/.test(el('#ferr').textContent), 'celular curto é recusado');
  await submitSheet({ tipo:'doc', chave:'123.456.789-09', nome:'Locadora Exemplo', cidade:'Campinas' });
  click('pagamentos',{id:'ex-l2'}); await sleep(30);
  ok(el('#f-pix').value.indexOf('0111' + '12345678909')>-1, 'CPF vai só com números (11 dígitos), sem +55'); click('fechar');
  await cfg({ tipo:'email', chave:'semarroba', nome:'X', cidade:'Y' }); ok(/E-mail inválido/.test(el('#ferr').textContent), 'e-mail inválido é recusado');
  await submitSheet({ tipo:'email', chave:'  Contato@GiroMoto.com.br ', nome:'Locadora Exemplo', cidade:'Campinas' });
  click('pagamentos',{id:'ex-l2'}); await sleep(30);
  ok(/contato@giromoto\.com\.br/.test(el('#f-pix').value), 'e-mail vai em minúsculas e sem espaços'); click('fechar');
  await cfg({ tipo:'aleatoria', chave:'abc', nome:'X', cidade:'Y' }); ok(/Chave aleatória inválida/.test(el('#ferr').textContent), 'chave aleatória inválida é recusada');
  await submitSheet({ tipo:'aleatoria', chave:'123E4567-E89B-12D3-A456-426614174000', nome:'Locadora Exemplo', cidade:'Campinas' });
  click('pagamentos',{id:'ex-l2'}); await sleep(30);
  ok(/123e4567-e89b-12d3-a456-426614174000/.test(el('#f-pix').value), 'chave aleatória aceita');
  click('fechar');
  console.log('Sem tipo informado (compatibilidade)');
  await cfg({ chave:'+5511999998888', nome:'Teste', cidade:'SP' }); click('fechar');
  click('pagamentos',{id:'ex-l2'}); await sleep(30); ok(/0114\+5511999998888/.test(el('#f-pix').value), 'tipo é deduzido quando não vem no formulário');
  console.log(`\n${pass} ok, ${fail} falhas`); process.exit(fail?1:0);
})().catch((e)=>{console.error('ERRO NO TESTE',e);process.exit(2)});
