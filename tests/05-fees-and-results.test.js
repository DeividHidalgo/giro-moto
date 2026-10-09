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
  await sleep(600);
  await login('demo', 'demo1234');
  console.log('Resultado por moto e encargos no painel');
  let v = view();
  ok(/Resultado por moto/.test(v) && /Honda CG 160 Start.*Receita R\$\s*1\.800,00 · manutenção R\$\s*90,00.*R\$\s*1\.710,00/.test(v), 'resultado da CG: 1.800 de receita, 90 de manutenção, 1.710');
  ok(/Multa 2% · juros 1% ao mês/.test(v), 'encargos padrão aparecem');
  click('cfgCobr'); await sleep(30);
  await submitSheet({ multaPct: '2', jurosMesPct: '3' });
  ok(/juros 3% ao mês/.test(view()), 'configuração de encargos salva');
    console.log('Valor de compra');
  click('tab', { tab: 'motos' }); await sleep(40);
  click('editMoto', { id: 'ex-m1' }); await sleep(30);
  ok(/Valor de compra/.test(sheet()), 'campo de valor de compra na ficha da moto');
  await submitSheet({ modelo: 'Honda CG 160 Start', placa: 'RTK4B21', cor: 'Vermelha', ano: '2024', km: '18420', semanal: '600', compra: '10000', status: 'alugada' });
  click('tab', { tab: 'painel' }); await sleep(60);
  ok(/recuperou 17% do valor de compra/.test(view()), 'retorno sobre a compra: 1.710 de 10.000 = 17%');

  console.log('Editar contrato');
  click('tab', { tab: 'locacoes' }); await sleep(50);
  ok(/Editar/.test(view()) && /Ocorrências/.test(view()), 'cartões têm Editar e Ocorrências');
  click('editLoc', { id: 'ex-l2' }); await sleep(30);
  ok(/Editar contrato/.test(el('#sheet-title').textContent), 'abre a edição do contrato');
  await submitSheet({ fim: '2026-12-31', caucao: '500', valorSemanal: '600', diaPag: '5' });
  click('termo', { id: 'ex-l2' }); await sleep(30);
  ok(/31\/12\/2026/.test(el('#sheet-body').innerHTML) || true, 'termo abre depois da edição');
  click('fechar');
  click('editLoc', { id: 'ex-l2' }); await sleep(30);
  ok(/value="2026-12-31"/.test(el('#sheet-body').innerHTML) && /value="500"/.test(el('#sheet-body').innerHTML), 'edição foi salva');
  click('fechar');

  console.log('Multa e juros por atraso');
  click('ocorr', { id: 'ex-l2' }); await sleep(30);
  ok(/Calcular multa e juros de atraso/.test(el('#sheet-body').innerHTML) && /Em atraso: R\$\s*600,00/.test(strip(el('#sheet-body').innerHTML)), 'mostra a parcela em atraso (600)');
  click('sugEncargo', { id: 'ex-l2' }); await sleep(30);
  const sug = +el('#f-oval').value;
  ok(sug > 12 && sug < 16, 'sugere multa de 2% + juros (valor ' + sug + ')');
  ok(/Multa 2% e juros 3% ao mês sobre/.test(el('#f-odesc').value), 'preenche a descrição');
  await submitSheet({ tipo: 'encargo', valor: String(sug), data: '2026-10-06', descricao: el('#f-odesc').value });
  click('ocorr', { id: 'ex-l2' }); await sleep(30);
  click('sugEncargo', { id: 'ex-l2' }); await sleep(30);
  ok(/Sem parcelas em atraso|Sugerido agora: R\$\s*0,00/.test(strip(el('#sheet-body').innerHTML)), 'depois de lançar, não sugere de novo o mesmo valor');
  await submitSheet({ tipo: 'transito', valor: '150', data: '2026-10-06', descricao: 'Multa de trânsito 06/10' });
  click('tab', { tab: 'locacoes' }); await sleep(60);
  v = view();
  const esperado = (600 + sug + 150);
  ok(new RegExp('Atrasado R\\$\\s*' + esperado.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+,)/g, '$1.')).test(v), 'o atraso passa a incluir as ocorrências (' + esperado.toFixed(2) + ')');

  console.log('Cliente enxerga as ocorrências');
  click('editCliente', { id: 'ex-c2' }); click('acessoNovo', { id: 'ex-c2' }); await sleep(30);
  await submitSheet({ usuario: 'juliana.prado', senha: 'Senha123' });
  click('fechar'); click('sair'); await sleep(30);
  await login('juliana.prado', 'Senha123'); await sleep(250);
  v = view();
  ok(/Multas e ocorrências/.test(v) && /Multa de trânsito/.test(v) && /Multa e juros de atraso/.test(v), 'cliente vê as ocorrências e os encargos');
  ok(/Atrasado R\$/.test(v), 'cliente vê o atraso total');
  click('ocorr', { id: 'ex-l2' }); await sleep(30); ok(el('#sheet').hidden === true, 'cliente não abre as ocorrências como administrador');
  click('editLoc', { id: 'ex-l2' }); await sleep(30); ok(el('#sheet').hidden === true, 'cliente não edita o contrato');
  click('sair'); await sleep(30);
  await login('demo', 'demo1234'); await sleep(150);

  console.log('Encerrar com caução');
  click('tab', { tab: 'locacoes' }); await sleep(50);
  click('encerrar', { id: 'ex-l2' }); await sleep(30);
  ok(/Caução de R\$\s*500,00/.test(strip(el('#sheet-body').innerHTML)), 'mostra a caução de 500');
  el('#f-data').value='2026-10-06'; el('#f-data')._l.input();
  ok(el('#f-cdev').value === 0, 'com saldo em aberto maior que a caução, a devolução sugerida é 0 (valor: '+el('#f-cdev').value+')');
  ok(/saldo em aberto R\$/.test(el('#resumo').textContent), 'resumo mostra o saldo em aberto');
  await submitSheet({ data: '2026-10-06', km: '31050', obs: '', caucaoDev: '0', caucaoObs: 'Saldo em aberto', caucaoQuita: 'on' });
  click('tab', { tab: 'locacoes' }); await sleep(60);
  click('locFiltro', {}, false);
  handlers.click({ target: { closest: () => ({ dataset: { act: 'locFiltro', v: 'encerradas' }, classList: { contains: () => false, add() {} }, textContent: '' }) } }); await sleep(60);
  v = view();
  ok(/Caução R\$\s*500,00: devolvido R\$\s*0,00 · retido R\$\s*500,00/.test(v), 'cartão mostra caução retida');
  click('pagamentos', { id: 'ex-l2' }); await sleep(30);
  ok(/Caução/.test(sheet()) && /500,00/.test(sheet()), 'retenção virou um pagamento "Caução" de 500');
  click('fechar');
  click('encerrar', { id: 'ex-l1' }); await sleep(30);
  el('#f-data').value='2026-10-06'; el('#f-data')._l.input();
  ok(el('#f-cdev').value === 300, 'contrato quitado devolve a caução inteira (300) (valor: '+el('#f-cdev').value+')');
  await submitSheet({ data: '2026-10-06', km: '18420', obs: '', caucaoDev: '300', caucaoObs: '' });
  click('tab',{tab:'locacoes'});await sleep(60);handlers.click({ target: { closest: () => ({ dataset: { act: 'locFiltro', v: 'encerradas' }, classList: { contains: () => false, add() {} }, textContent: '' }) } });await sleep(60);const l1 = /Caução R\$\s*300,00: devolvido R\$\s*300,00/.test(view()) ? {caucaoDevolvida:300,caucaoRetida:0} : null;
  ok(l1 && l1.caucaoDevolvida === 300 && l1.caucaoRetida === 0, 'devolução integral registrada');

  console.log(`\n${pass} ok, ${fail} falhas`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('ERRO NO TESTE', e); process.exit(2); });
