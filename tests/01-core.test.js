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
};
global.window = { scrollTo() {}, crypto: webcrypto };
global.crypto = webcrypto;
global.navigator = {};
const ss = new Map();
global.sessionStorage = { getItem: (k) => (ss.has(k) ? ss.get(k) : null), setItem: (k, v) => ss.set(k, v), removeItem: (k) => ss.delete(k) };
global.FormData = function (f) { this.forEach = (cb) => Object.keys(f._fd).forEach((k) => cb(f._fd[k], k)); };

(0, eval)(fs.readFileSync(path.join(__dirname, '.build','app.js'), 'utf8'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const click = (act, extra = {}, sure = false) => handlers.click({ target: { closest: () => ({ dataset: Object.assign({ act }, extra), classList: { contains: () => sure, add() {} }, textContent: '' }) } });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m); } else { fail++; console.log('  FAIL', m); } };
async function login(u, p) {
  el('#lu').value = u; el('#lp').value = p;
  await el('#lf')._l.submit({ preventDefault() {} });
  await sleep(120);
}
async function submitSheet(fd) {
  el('#f')._fd = fd;
  el('#f')._l.submit({ preventDefault() {} });
  await sleep(400);
}

(async () => {
  await sleep(600);
  console.log('Início');
  ok(el('#lhint').hidden === false && /rafael\.moreira/.test(el('#lhint').textContent), 'modo demonstração mostra o cliente de teste');
  ok(el('#shell').hidden === true, 'app fechado antes do login');

  console.log('Admin');
  await login('demo', 'demo1234');
  ok(el('#shell').hidden === false && el('#login').hidden === true, 'admin entra');
  ok(el('.tabs').hidden === false, 'admin vê as abas');
  ok(/Frota hoje/.test(strip(el('#view').innerHTML)), 'painel do dono aparece');

  click('cfgPix');
  await submitSheet({ chave: '+5515998123344', nome: 'Locadora Exemplo', cidade: 'Campinas' });
  click('tab', { tab: 'clientes' }); await sleep(50);
  const lista = strip(el('#view').innerHTML);
  ok(/App: rafael\.moreira/.test(lista) && /Sem acesso ao app/.test(lista), 'lista de clientes mostra quem tem acesso');

  click('editCliente', { id: 'ex-c2' }); await sleep(30);
  ok(/Criar acesso do cliente/.test(el('#sheet-body').innerHTML), 'ficha da Juliana oferece criar acesso');
  click('acessoNovo', { id: 'ex-c2' }); await sleep(30);
  ok(/value="juliana\.prado"/.test(el('#sheet-body').innerHTML), 'usuário sugerido a partir do nome');
  await submitSheet({ usuario: 'rafael.moreira', senha: 'Senha123' });
  ok(/já está em uso/.test(el('#ferr').textContent), 'recusa usuário repetido de outro cliente');
  await submitSheet({ usuario: 'Jú', senha: 'Senha123' });
  ok(/3 a 30/.test(el('#ferr').textContent), 'recusa usuário inválido');
  await submitSheet({ usuario: 'juliana.prado', senha: '123' });
  ok(/pelo menos 6/.test(el('#ferr').textContent), 'recusa senha curta');
  await submitSheet({ usuario: 'juliana.prado', senha: 'Senha123' });
  ok(/Acesso pronto/.test(el('#sheet-title').textContent) && /Senha: Senha123/.test(el('#sheet-body').innerHTML), 'mostra os dados para enviar ao cliente');

  console.log('Cliente Juliana');
  click('sair'); await sleep(30);
  ok(el('#shell').hidden === true && el('#login').hidden === false, 'sair volta para o login');
  await login('juliana.prado', 'errada');
  ok(/incorretos/.test(el('#lerr').textContent) && el('#shell').hidden === true, 'senha errada não entra');
  await login('Juliana.Prado', 'Senha123');
  await sleep(150);
  ok(el('#shell').hidden === false, 'cliente entra (usuário sem diferenciar maiúscula)');
  ok(el('.tabs').hidden === true, 'cliente não vê as abas do dono');
  const v = strip(el('#view').innerHTML);
  ok(/Olá, Juliana/.test(v), 'saudação com o nome');
  ok(/Honda Biz 125/.test(v) && /QWE2C45/.test(v), 'vê a própria moto');
  ok(!/Honda CG 160/.test(v) && !/RTK4B21/.test(v) && !/Yamaha/.test(v) && !/Rafael|Marcos/.test(v), 'não vê moto nem cliente dos outros');
  ok(/R\$\s*600,00 por semana/.test(v) && /toda sexta/.test(v), 'vê valor semanal e dia de pagamento');
  ok(/Atrasado/.test(v), 'vê o atraso do próprio contrato');
  ok(!/Remover exemplos|Nova moto|Novo cliente|Encerrar locação/.test(v), 'sem controles de administração');

  click('novaMoto'); await sleep(30);
  ok(el('#sheet').hidden === true, 'ação de administrador é ignorada para o cliente');
  click('editCliente', { id: 'ex-c1' }); await sleep(30);
  ok(el('#sheet').hidden === true, 'cliente não abre ficha de outro cliente');

  click('pagarPix', { id: 'ex-l2' }); await sleep(30);
  const sb = el('#sheet-body').innerHTML;
  ok(/000201/.test(sb) && /Valor: R\$\s*600,00/.test(sb), 'gera Pix copia e cola com o valor em atraso');

  console.log('Cliente Rafael');
  click('fechar'); click('sair'); await sleep(30);
  await login('rafael.moreira', 'demo1234'); await sleep(150);
  const r = strip(el('#view').innerHTML);
  ok(/Olá, Rafael/.test(r) && /Honda CG 160 Start/.test(r) && /Yamaha Fazer 250/.test(r), 'Rafael vê as duas locações dele');
  ok(!/Honda Biz/.test(r) && !/Juliana/.test(r), 'Rafael não vê a locação da Juliana');
  ok(/Encerrada/.test(r), 'locação encerrada aparece como encerrada');

  console.log('Admin remove acesso');
  click('sair'); await sleep(30);
  await login('demo', 'demo1234'); await sleep(100);
  click('tab', { tab: 'clientes' }); await sleep(50);
  click('editCliente', { id: 'ex-c2' }); await sleep(30);
  ok(/Remover acesso/.test(el('#sheet-body').innerHTML) && /Nova senha/.test(el('#sheet-body').innerHTML), 'ficha mostra nova senha e remover');
  click('acessoSenha', { id: 'ex-c2' }); await sleep(30);
  await submitSheet({ usuario: 'juliana.prado', senha: 'Outra4567' });
  click('fechar');
  click('sair'); await sleep(30);
  await login('juliana.prado', 'Senha123');
  ok(el('#shell').hidden === true, 'senha antiga deixa de valer');
  await login('juliana.prado', 'Outra4567'); await sleep(100);
  ok(el('#shell').hidden === false, 'senha nova vale');
  click('sair'); await sleep(30);
  await login('demo', 'demo1234'); await sleep(100);
  click('tab', { tab: 'clientes' }); await sleep(50);
  click('editCliente', { id: 'ex-c2' }); await sleep(30);
  click('acessoDel', { id: 'ex-c2' }); await sleep(30); click('acessoDel', { id: 'ex-c2' }, true); await sleep(200);
  click('sair'); await sleep(30);
  await login('juliana.prado', 'Outra4567');
  ok(el('#shell').hidden === true, 'acesso removido não entra mais');

  console.log(`\n${pass} ok, ${fail} falhas`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('ERRO NO TESTE', e); process.exit(2); });
