// Componentes reais com API fictícia: não lê credenciais nem altera pedidos do banco.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';

const destino = 'AMPLIACAO_DA_INFRAESTRUTURA_DE_REDE_ELETRICA_E_TELECOMUNICACOES_BLOCO_B';
const obras = [{ id: 1, nome: 'Residencial Santa Maria — infraestrutura e implantação da rede de fibra óptica no bloco administrativo' }, { id: 2, nome: destino }];
const materiais = [{ id: 10, nome: 'Escada extensível de alumínio com plataforma e trava de segurança', catalogoChave: 'escada', quantidade: 7 }, { id: 11, nome: 'Capacete de segurança com ajuste e proteção para instalações elétricas', catalogoChave: 'capacete', quantidade: 2, quantidadeEntradaEstoque: 1 }];
const pedido = { id: 123, tecnico: 'Ana Carolina Ferreira de Albuquerque — Técnica de Segurança do Trabalho', obraDestinoId: 2, materiais, entradasCompra: [{ equipamentoId: 5 }] };
const equipamentos = [
  { id: 1, serie: 'ERA-DEP-1', obraId: null, quantidadeDisponivel: 2 },
  { id: 2, serie: 'ERA-IDENTIFICACAO-COMPRIDA-PARA-RASTREAMENTO-DE-EQUIPAMENTO-2026', obraId: null, quantidadeDisponivel: 1 },
  { id: 3, serie: 'ERA-OBRA-3', obraId: 1, quantidadeDisponivel: 4, tecnico: pedido.tecnico },
  { id: 4, serie: 'ERA-OBRA-4', obraId: 1, quantidadeDisponivel: 3, tecnico: pedido.tecnico },
].map((e) => ({ ...e, modelo: materiais[0].nome, catalogoChave: 'escada', status: e.obraId ? 'Em campo' : 'Em estoque' }));
equipamentos.push({ id: 5, serie: 'ENTRADA-DO-PEDIDO', modelo: materiais[1].nome, catalogoChave: 'capacete', status: 'Em estoque', obraId: null, quantidadeDisponivel: 1 });
const pasta = path.resolve('node_modules/.cache/plano-financeiro'); fs.mkdirSync(pasta, { recursive: true });
const html = (tema, modo) => `<!doctype html><html data-theme="${tema}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{SepararEquipamentosModal}from'/src/components/estoque/SepararEquipamentosModal.jsx';import{AtendimentoParcialModal}from'/src/components/estoque/AtendimentoParcialModal.jsx';import{DetalhesSolicitacao}from'/src/components/painel/DetalhesSolicitacao.jsx';import'/src/index.css';
const solicitacao=${JSON.stringify(pedido)};if('${modo}'==='antigo')solicitacao.planoFinanceiro=[{materialId:10,quantidadeCompra:0,origens:[{equipamentoId:999,quantidade:7}]}];
if(['parcial','revisao','detalhes'].includes('${modo}')){solicitacao.status='Aprovada';solicitacao.planoFinanceiro=[{materialId:10,quantidadeCompra:2,justificativa:'Preservar o saldo em uso.',origens:[{equipamentoId:1,identificacao:'ERA-DEP-1',obraOrigemId:null,quantidade:2,nome:solicitacao.materiais[0].nome,catalogoChave:'escada'},{equipamentoId:3,identificacao:'ERA-OBRA-3',obraOrigemId:1,quantidade:3,nome:solicitacao.materiais[0].nome,catalogoChave:'escada'}]},{materialId:11,quantidadeCompra:2,justificativa:'Comprar EPIs.',origens:[]}];solicitacao.entradasCompra=[{equipamentoId:5,identificacao:'ENTRADA-EPI',obraOrigemId:null,quantidade:1,nome:solicitacao.materiais[1].nome,catalogoChave:'capacete'},{equipamentoId:6,identificacao:'ENTRADA-ESCADA',obraOrigemId:null,quantidade:1,nome:solicitacao.materiais[0].nome,catalogoChave:'escada'}];}
window.envios=[];window.falhar=false;
function Pagina(){const[aberto,setAberto]=useState(true);const[planejando,setPlanejando]=useState('${modo}'!=='detalhes');const salvar=async(id,dados)=>{window.envios.push(dados);const r=await fetch('/__salvar',{method:'POST',headers:{'Content-Type':'application/json','X-Teste-Falha':String(window.falhar)},body:JSON.stringify(dados)});if(!r.ok)throw Error((await r.json()).mensagem);setAberto(false);return true;};return aberto?(!planejando?React.createElement(DetalhesSolicitacao,{solicitacao,perfil:'FINANCEIRO',equipamentos:${JSON.stringify(equipamentos)},buscarObraPorId:id=>${JSON.stringify(obras)}.find(o=>o.id===id),aoPlanejar:()=>setPlanejando(true)}):React.createElement('${modo}'==='parcial'?AtendimentoParcialModal:SepararEquipamentosModal,{solicitacao,obras:${JSON.stringify(obras)},equipamentos:${JSON.stringify(equipamentos)},aoFechar:()=>setAberto(false),aoSalvarPlano:salvar,aoSalvar:salvar})):React.createElement('p',{role:'status'},'Plano salvo ou janela fechada');}
createRoot(document.getElementById('root')).render(React.createElement(Pagina));</script></body></html>`;
const servidor = await createServer({ server: { host: '127.0.0.1', port: 0 }, plugins: [{ name: 'plano-fixtures', configureServer(s) { s.middlewares.use(async (req, res, next) => {
  if (req.url.startsWith('/__plano')) { const p = new URL(req.url, 'http://localhost').searchParams; res.setHeader('Content-Type', 'text/html'); res.end(await s.transformIndexHtml(req.url, html(p.get('tema') || 'light', p.get('modo') || 'novo'))); return; }
  if (req.url === '/__salvar') { for await (const parte of req) void parte; await new Promise((r) => setTimeout(r, 450)); res.setHeader('Content-Type', 'application/json'); res.statusCode = req.headers['x-teste-falha'] === 'true' ? 409 : 200; res.end(JSON.stringify({ mensagem: 'O saldo mudou. Revise as origens antes de salvar.' })); return; }
  next();
}); } }] });
await servidor.listen();
const base = 'http://127.0.0.1:' + servidor.httpServer.address().port;
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'era-plano-'));
const chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--no-first-run', '--disable-gpu', '--disable-background-networking', '--remote-debugging-port=0', '--user-data-dir=' + perfil, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let ws;
const resultados = [];
try {
  const endpoint = await new Promise((resolve, reject) => { let saida = ''; const tempo = setTimeout(() => reject(Error('Chrome não iniciou')), 15000); chrome.stderr.on('data', (b) => { saida += b; const m = saida.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) { clearTimeout(tempo); resolve(m[1]); } }); chrome.on('error', reject); });
  ws = new WebSocket(endpoint); await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  let numero = 0; const pendentes = new Map();
  ws.addEventListener('message', ({ data }) => { const m = JSON.parse(data); if (m.id) { const p = pendentes.get(m.id); pendentes.delete(m.id); if (m.error) p.reject(Error(JSON.stringify(m.error))); else p.resolve(m.result); } });
  const enviar = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++numero; pendentes.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
  const { targetId } = await enviar('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await enviar('Target.attachToTarget', { targetId, flatten: true });
  const cdp = (method, params) => enviar(method, params, sessionId);
  const avaliar = async (expression) => { const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
  const esperar = async (expression) => { for (let n = 0; n < 120; n++) { if (await avaliar(`Boolean(${expression})`)) return; await new Promise((r) => setTimeout(r, 80)); } throw Error('Tempo esgotado: ' + expression); };
  const botao = (texto) => `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim().startsWith(${JSON.stringify(texto)}))`;
  const tocar = async (expression) => {
    const p = await avaliar(`(()=>{const e=${expression};if(!e||e.disabled)return null;e.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return{x,y,alcancavel:e.contains(document.elementFromPoint(x,y))};})()`);
    assert.ok(p?.alcancavel, 'Controle alcançável: ' + expression);
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 }); await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
    await new Promise((r) => setTimeout(r, 70));
  };
  const preencher = async (expression, valor) => {
    await avaliar(`(()=>{const e=${expression};Object.getOwnPropertyDescriptor(e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(String(valor))});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await new Promise((r) => setTimeout(r, 35));
  };
  const inspecionar = async (nome, foto = false) => {
    const r = await avaliar(`(()=>{const d=document.querySelector('[role=dialog]');const problemas=[...d.querySelectorAll('*')].filter(e=>!['svg','path','input','textarea','select','option'].includes(e.tagName.toLowerCase())&&e.clientWidth>0&&e.scrollWidth>e.clientWidth+2&&!['auto','scroll'].includes(getComputedStyle(e).overflowX)).map(e=>({classe:String(e.className),largura:e.clientWidth,conteudo:e.scrollWidth}));const scroll=d.querySelector('[class*=materiais]'),salvar=d.querySelector('[type=submit]').getBoundingClientRect();return{pagina:document.documentElement.scrollWidth,viewport:innerWidth,problemas,areaRolagem:scroll.clientHeight,botaoVisivel:salvar.bottom<=innerHeight&&salvar.top>=0,localLegivel:[...d.querySelectorAll('h4')].every(e=>parseFloat(getComputedStyle(e).fontSize)>=16)};})()`);
    resultados.push({ nome, ...r });
    if (foto) fs.writeFileSync(path.join(pasta, `${nome}.png`), Buffer.from((await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64'));
    assert.ok(r.pagina <= r.viewport && !r.problemas.length && r.areaRolagem > 50 && r.botaoVisivel && r.localLegivel, JSON.stringify({ nome, ...r }));
  };
  await cdp('Page.enable'); await cdp('Runtime.enable');
  for (const largura of [320, 390, 768, 844, 1024, 1440]) for (const tema of ['light', 'dark']) {
    const nome = `${largura}-${tema}`;
    await cdp('Emulation.setDeviceMetricsOverride', { width: largura, height: largura === 844 ? 390 : largura < 768 ? 844 : 1000, deviceScaleFactor: 1, mobile: largura < 768 || largura === 844 });
    await cdp('Page.navigate', { url: `${base}/__plano?tema=${tema}` }); await esperar("document.querySelector('[role=dialog] h4')");
    await inspecionar(`${nome}-inicio`, [390, 1440].includes(largura));
    assert.equal(await avaliar("document.querySelectorAll('[aria-label^=\"Origens de\"] section').length"), 2, 'Equipamentos agrupados por local');
    await preencher("document.querySelector('input[aria-label$=\"(ERA-DEP-1)\"]')", 999);
    assert.equal(await avaliar("document.querySelector('input[aria-label$=\"(ERA-DEP-1)\"]').value"), '2');
    await preencher("document.querySelector('input[type=search]')", 'Depósito central');
    await tocar(botao('Usar saldo disponível'));
    assert.equal(await avaliar(`${botao('Usar saldo disponível')}.disabled`), true, 'Atalho desabilitado quando o saldo visível já foi utilizado');
    await preencher("document.querySelector('input[type=search]')", '');
    await tocar(botao('Usar saldo disponível'));
    assert.equal(await avaliar("document.querySelector('input[aria-label$=\"(ERA-OBRA-3)\"]').value"), '4');
    await tocar(botao('Limpar plano'));
    await preencher("document.querySelector('input[aria-label$=\"(ERA-DEP-1)\"]')", 2);
    await tocar(botao('Comprar as 5'));
    await preencher("document.querySelector('[aria-label^=\"Compra de Escada\"] textarea')", 'Preservar a escada em uso na obra de origem.');
    await tocar(botao('Comprar as 1'));
    await preencher("document.querySelector('[aria-label^=\"Compra de Capacete\"] textarea')", 'Complementar os EPIs já recebidos.');
    assert.equal(await avaliar("document.querySelector('[type=submit]').disabled"), false);
    await preencher("document.querySelector('input[type=search]')", 'Santa Maria');
    assert.equal(await avaliar("document.querySelectorAll('h4').length"), 1);
    await preencher("document.querySelector('input[type=search]')", '');
    await avaliar("(()=>{const e=document.querySelector('select');e.value='pendentes';e.dispatchEvent(new Event('change',{bubbles:true}));})()");
    await esperar("!document.querySelector('h2')");
    assert.equal(await avaliar("document.querySelector('[type=submit]').disabled"), false, 'Filtro não altera o plano');
    await tocar(botao('Limpar filtros'));
    await esperar("document.querySelectorAll('h2').length===2");
    await inspecionar(`${nome}-preenchido`);
    if (largura === 390 && tema === 'light') {
      await avaliar('window.falhar=true'); await tocar("document.querySelector('[type=submit]')");
      assert.equal(await avaliar("document.querySelector('fieldset').disabled"), true);
      await avaliar("document.querySelector('form').requestSubmit()");
      await esperar("document.querySelector('[role=alert]')");
      assert.equal(await avaliar('window.envios.length'), 1, 'Sem envio duplicado');
      assert.match(await avaliar("document.querySelector('[role=alert]').textContent"), /saldo mudou/);
      await inspecionar(`${nome}-erro`, true); await avaliar('window.falhar=false');
    }
    await tocar("document.querySelector('[type=submit]')"); await esperar("!document.querySelector('[role=dialog]')");
    const dados = await avaliar('window.envios.at(-1)');
    assert.deepEqual(dados.materiais[0].origens, [{ equipamentoId: 1, quantidade: 2 }]); assert.equal(dados.materiais[0].quantidadeCompra, 5); assert.equal(dados.materiais[1].quantidadeCompra, 2);
  }
  await cdp('Page.navigate', { url: `${base}/__plano?modo=antigo` }); await esperar("document.querySelector('[role=alert]')");
  assert.equal(await avaliar("document.querySelector('[type=submit]').disabled"), true);
  await tocar(botao('Remover seleção #999')); await esperar("!document.querySelector('[role=alert]')");
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' }); await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' }); await esperar("!document.querySelector('[role=dialog]')");
  for (const largura of [320, 390, 844, 1440]) for (const tema of ['light', 'dark']) {
    await cdp('Emulation.setDeviceMetricsOverride', { width: largura, height: largura === 844 ? 390 : 900, deviceScaleFactor: 1, mobile: largura < 768 || largura === 844 });
    await cdp('Page.navigate', { url: `${base}/__plano?modo=revisao&tema=${tema}` });await esperar("document.querySelector('[role=dialog] h4')");
    await tocar(botao('Comprar tudo e manter nas origens'));
    assert.equal(await avaliar("document.querySelector('input[aria-label$=\"(ERA-DEP-1)\"]').value"), '0');
    assert.equal(await avaliar("document.querySelector('[type=submit]').disabled"), true, 'Revisão exige motivo');
    await preencher("document.querySelector('textarea[placeholder^=\"Ex.: fornecedor\"]')", 'Obra de origem precisa manter os equipamentos.');
    await inspecionar(`${largura}-${tema}-revisao`);
    await tocar("document.querySelector('[type=submit]')");await esperar("!document.querySelector('[role=dialog]')");
    const revisao=await avaliar('window.envios.at(-1)');assert.equal(revisao.materiais[0].quantidadeCompra,7);assert.deepEqual(revisao.materiais[0].origens,[]);assert.ok(revisao.motivoRevisao);
    await cdp('Page.navigate', { url: `${base}/__plano?modo=parcial&tema=${tema}` });await esperar("document.querySelector('[role=dialog] textarea')");
    const medidas=await avaliar("(()=>{const d=document.querySelector('[role=dialog]');return {pagina:document.documentElement.scrollWidth,viewport:innerWidth,problemas:[...d.querySelectorAll('*')].filter(e=>!['svg','path','input','textarea','select'].includes(e.tagName.toLowerCase())&&e.clientWidth>0&&e.scrollWidth>e.clientWidth+2&&!['auto','scroll'].includes(getComputedStyle(e).overflowX)).map(e=>String(e.className))};})()");
    assert.ok(medidas.pagina<=medidas.viewport&&!medidas.problemas.length,JSON.stringify(medidas));resultados.push({nome:`${largura}-${tema}-parcial`,...medidas});
    if([390,1440].includes(largura))fs.writeFileSync(path.join(pasta,`${largura}-${tema}-parcial.png`),Buffer.from((await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
    await preencher("document.querySelector('input[aria-label$=\"ERA-DEP-1\"]')",999);assert.equal(await avaliar("document.querySelector('input[aria-label$=\"ERA-DEP-1\"]').value"),'2');
    await preencher("document.querySelector('textarea')",'Fornecedor sem a quantidade total. Manter o restante pendente.');
    await tocar(botao('Separar itens selecionados'));await esperar("!document.querySelector('[role=dialog]')");
    const parcial=await avaliar('window.envios.at(-1)');assert.ok(parcial.motivo);assert.equal(parcial.materiais[0].origens.reduce((s,o)=>s+o.quantidade,0),6);assert.equal(parcial.materiais[1].origens[0].quantidade,1);
  }
  for(const largura of [390,1440]){
    await cdp('Emulation.setDeviceMetricsOverride',{width:largura,height:900,deviceScaleFactor:1,mobile:largura<768});
    await cdp('Page.navigate',{url:`${base}/__plano?modo=detalhes`});await esperar(`${botao('Editar atendimento aprovado')}`);
    await tocar(botao('Editar atendimento aprovado'));await esperar("document.querySelector('[role=dialog] h4')");await inspecionar(`${largura}-botao-revisao-acessivel`);
  }
  fs.writeFileSync(path.join(pasta, 'relatorio.json'), JSON.stringify(resultados, null, 2));
  console.log(JSON.stringify({ cenarios: resultados.length, falhas: 0, artefatos: pasta }, null, 2));
} finally {
  ws?.close(); chrome.kill(); await servidor.close();
}
