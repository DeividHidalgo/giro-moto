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

  console.log('Painel: alertas de manutenção, documentos, vistoria e termo');
  let v = view();
  ok(/Troca de óleo vencida há 550 km/.test(v), 'óleo vencido da Biz aparece (31.050 km, última troca 27.500, intervalo 3.000)');
  ok(/IPVA vence em 12 dias/.test(v), 'IPVA da Fazer perto de vencer');
  ok(/Vistoria de entrega pendente/.test(v) && /Termo sem aceite do cliente/.test(v), 'locação da Juliana sem vistoria e sem aceite');
  ok(/Manutenção em \w+ R\$\s*0,00/.test(v), 'custo de manutenção do mês aparece');
  ok(/Termo de locação.*Usando o modelo padrão/.test(v), 'seção do termo no painel');

  console.log('Manutenção');
  click('tab', { tab: 'motos' }); await sleep(50);
  ok(/Atenção Troca de óleo vencida há 550 km/.test(view()), 'lista de motos mostra o alerta');
  click('editMoto', { id: 'ex-m2' }); await sleep(30);
  ok(/Documentos e manutenção/.test(sheet()) && /Registrar manutenção/.test(sheet()), 'ficha da moto tem documentos e manutenção');
  click('novaManut', { id: 'ex-m2' }); await sleep(30);
  await submitSheet({ tipo: 'oleo', data: '2026-10-06', km: '31100', custo: '95.50', obs: 'Óleo 10W30 e filtro' });
  await sleep(100);
  click('tab', { tab: 'painel' }); await sleep(80);
  v = view();
  ok(!/Troca de óleo vencida/.test(v), 'registrar a troca de óleo apaga o alerta');
  ok(/Manutenção em \w+ R\$\s*95,50/.test(v), 'custo do mês soma 95,50');
  click('editMoto', { id: 'ex-m2' }); await sleep(30);
  ok(/Histórico de manutenção/.test(sheet()) && /95,50/.test(sheet()) && /31\.100 km/.test(sheet()), 'histórico mostra o registro');
  const rid = (el('#sheet-body').innerHTML.match(/data-act="delManut" data-id="([^"]+)"/) || [])[1];
  click('delManut', { id: rid, moto: 'ex-m2' }); await sleep(50);
  ok(/95,50/.test(sheet()), 'primeiro toque em excluir só pede confirmação');
  click('delManut', { id: rid, moto: 'ex-m2' }, true); await sleep(150);
  ok(/Nenhuma manutenção registrada/.test(sheet()), 'segundo toque exclui o registro');
  click('fechar');

  console.log('Termo');
  click('tab', { tab: 'locacoes' }); await sleep(50);
  ok(/Termo sem aceite/.test(view()) && /Entrega sem vistoria/.test(view()), 'cartões mostram o estado dos documentos');
  click('termo', { id: 'ex-l2' }); await sleep(30);
  let tb = el('#sheet-body').innerHTML;
  ok(/Juliana Prado/.test(tb) && /R\$\s*600,00 por semana, toda sexta/.test(tb) && /QWE2C45/.test(tb) && !/\{cliente\}|\{placa\}/.test(tb), 'termo preenchido com os dados do contrato');
  await submitSheet({ aceiteEm: '2026-10-06' });
  click('modeloTermo'); await sleep(30);
  await submitSheet({ locador: 'Locadora Exemplo', texto: 'CONTRATO PERSONALIZADO entre {locador} e {cliente}, moto {moto} placa {placa}, valor {valorSemanal} toda {diaPagamento}. Devolução {devolucao}.' });
  click('termo', { id: 'ex-l2' }); await sleep(30);
  tb = el('#sheet-body').innerHTML;
  ok(/CONTRATO PERSONALIZADO entre Locadora Exemplo e Juliana Prado/.test(tb), 'modelo editado vale para os contratos');
  ok(/value="2026-10-06"/.test(tb), 'aceite registrado aparece na ficha');
  click('fechar');

  console.log('Vistoria com fotos');
  click('vistorias', { id: 'ex-l2' }); await sleep(30);
  ok(/Ainda não registrada/.test(sheet()), 'vistoria de entrega ainda não registrada');
  click('vistoria', { id: 'ex-l2', tipo: 'entrega' }); await sleep(30);
  ok(/Vistoria de entrega/.test(el('#sheet-title').textContent), 'abre o formulário de vistoria');
  await el('#f-fotos')._l.change({ target: { files: [{ name: 'a.jpg' }, { name: 'b.jpg' }], value: 'x' } });
  await sleep(100);
  ok((el('#fgrid').innerHTML.match(/<img/g) || []).length === 2, 'duas fotos novas aparecem na grade');
  ok(/\(2 de 8\)/.test(el('#fcount').textContent), 'contador de fotos');
  await submitSheet({ data: '2026-10-04', km: '31100', combustivel: '3/4', obs: 'Risco na lateral direita' });
  click('tab', { tab: 'locacoes' }); await sleep(60);
  ok(/Entrega vistoriada/.test(view()), 'cartão mostra a entrega vistoriada');
  click('vistorias', { id: 'ex-l2' }); await sleep(30);
  ok(/04\/10\/2026 · 31\.100 km · 2 fotos/.test(sheet()), 'lista da vistoria mostra data, km e fotos');
  click('vistoria', { id: 'ex-l2', tipo: 'entrega' }); await sleep(100);
  ok((el('#fgrid').innerHTML.match(/<img/g) || []).length === 2, 'ao reabrir, as fotos salvas voltam');
  // remover uma foto salva (dois toques)
  const fid = (el('#fgrid').innerHTML.match(/data-foto="([^"]+)"/) || [])[1];
  const mkBtn = (sure) => ({ dataset: { kind: 'salva', foto: fid }, classList: { contains: () => sure, add() {} }, textContent: '' });
  el('#fgrid')._l.click({ target: { closest: (s) => (s === '[data-foto]' ? mkBtn(true) : null) } });
  await sleep(100);
  ok((el('#fgrid').innerHTML.match(/<img/g) || []).length === 1, 'excluir foto salva remove da grade');
  click('fechar');

  console.log('Cliente Juliana vê termo e vistoria');
  click('editCliente', { id: 'ex-c2' }); // ficha
  click('acessoNovo', { id: 'ex-c2' }); await sleep(30);
  await submitSheet({ usuario: 'juliana.prado', senha: 'Senha123' });
  click('fechar'); click('sair'); await sleep(30);
  await login('juliana.prado', 'Senha123'); await sleep(200);
  v = view();
  ok(/Documentos/.test(v) && /Termo de locação/.test(v) && /Aceito em 06\/10\/2026/.test(v), 'termo aparece com o aceite');
  ok(/Vistoria de entrega/.test(v) && /1 foto/.test(v), 'vistoria de entrega aparece com 1 foto');
  ok(!/Honda CG 160 Start|Rafael/.test(v), 'continua sem ver dados de outros');
  click('verTermo', { id: 'ex-l2' }); await sleep(30);
  ok(/CONTRATO PERSONALIZADO entre Locadora Exemplo e Juliana Prado/.test(el('#sheet-body').innerHTML), 'cliente lê o termo com o modelo atual');
  ok(!/name="aceiteEm"/.test(el('#sheet-body').innerHTML), 'cliente não edita o aceite');
  click('fechar');
  const vid = 'v-ex-l2-entrega';
  click('verVist', { id: vid }); await sleep(100);
  ok((el('#fgrid').innerHTML.match(/<img/g) || []).length === 1 && /Risco na lateral direita/.test(el('#sheet-body').innerHTML), 'cliente vê a foto e a observação da vistoria');
  click('fechar');
  click('termo', { id: 'ex-l2' }); await sleep(30);
  ok(el('#sheet').hidden === true, 'cliente não consegue abrir o aceite como administrador');
  click('verVist', { id: 'v-ex-l1-entrega' }); await sleep(30);
  ok(el('#sheet').hidden === true, 'cliente não abre vistoria de outro contrato');

  console.log(`\n${pass} ok, ${fail} falhas`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('ERRO NO TESTE', e); process.exit(2); });
