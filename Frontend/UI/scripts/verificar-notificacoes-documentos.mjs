// Componentes reais, API fictícia e Chrome temporário; nenhum registro do banco é utilizado.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';
process.env.VITE_API_URL='/api';
const pasta=path.resolve('node_modules/.cache/notificacoes-documentos');fs.mkdirSync(pasta,{recursive:true});
const nome='Técnico responsável pela instalação e manutenção da rede';
const obras=[{id:1,nome:'Residencial Santa Maria — infraestrutura do bloco administrativo e rede de telecomunicações',cidade:'Manaus',responsaveis:[nome],status:'Em andamento'},{id:2,nome:'Obra B — implantação de rede',responsaveis:[nome],status:'Em andamento'}];
const equipamento={id:1,tipo:'Ferramentas',modelo:'ESCADA_EXTENSIVEL_COM_TRAVA_DE_SEGURANCA_E_PLATAFORMA_DE_TRABALHO',serie:'ERA-DEP-1',catalogoChave:'ferramentas|escada|',quantidade:10,quantidadeDisponivel:10,obraId:null,status:'Em estoque',historico:[]};
const pedido={id:10,tipo:'Movimentação',status:'Aprovada',tecnico:nome,solicitante:'Maria Gerente',solicitanteLogin:'maria',solicitantePerfil:'GERENTE',obraDestinoId:2,dataSolicitacao:'2026-10-22',materiais:[{id:1,nome:equipamento.modelo,quantidade:10,quantidadeCompra:4,quantidadeAdquirida:2,quantidadeEntradaEstoque:2}],planoFinanceiro:[{materialId:1,nome:equipamento.modelo,quantidadeCompra:4,origens:[{equipamentoId:1,obraOrigemId:null,identificacao:'ERA-DEP-1',quantidade:2},{equipamentoId:2,obraOrigemId:1,identificacao:'ERA-OBRA-1',quantidade:4}]}],entradasCompra:[{equipamentoId:3,obraOrigemId:null,nome:equipamento.modelo,identificacao:'ERA-COMPRA-1',quantidade:2}],eventosFinanceiros:[{tipo:'APROVACAO_INICIAL',registradoEm:'2026-10-22T08:00:00-04:00',autorNome:'Maria Gerente',autorLogin:'maria',descricao:'Pedido aprovado.'},{tipo:'APROVACAO',registradoEm:'2026-10-22T09:00:00-04:00',autorNome:'Financeiro',autorLogin:'financeiro',descricao:'Plano autorizado.'}]};
const estados=new Map();
const pagina=(role,tema)=>`<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
import React from'react';import{createRoot}from'react-dom/client';import{ProvedorAutenticacao,useAutenticacao}from'/src/contexto/ContextoAutenticacao.jsx';import{PainelTecnico}from'/src/components/tecnico/PainelTecnico.jsx';import{PainelEstoque}from'/src/components/estoque/PainelEstoque.jsx';import'/src/index.css';
import{PainelAdmin}from'/src/components/admin/PainelAdmin.jsx';import{PainelControleAtivos}from'/src/components/painel/PainelControleAtivos.jsx';localStorage.setItem('era-tema-admin','${tema==='dark'?'escuro':'claro'}');
window.documentos=[];window.open=()=>({document:{write:html=>window.documentos.push(html),close:()=>{},images:[]},focus:()=>{},print:()=>{}});
function Pagina(){const{usuario}=useAutenticacao();return usuario?React.createElement(({ADMIN:PainelAdmin,ESTOQUE:PainelEstoque,TECNICO:PainelTecnico,TST:PainelTecnico})['${role}']||PainelControleAtivos,{temaEscuro:${tema==='dark'}}):null;}createRoot(document.getElementById('root')).render(React.createElement(ProvedorAutenticacao,null,React.createElement(Pagina)));</script></body></html>`;
const servidor=await createServer({server:{host:'127.0.0.1',port:0},plugins:[{name:'avisos-fixtures',configureServer(s){s.middlewares.use(async(req,res,next)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/__avisos'){res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml(req.url,pagina(url.searchParams.get('role'),url.searchParams.get('tema'))));return;}
  if(!url.pathname.startsWith('/api/'))return next();
  const ref=new URL(req.headers.referer||'http://localhost'),role=ref.searchParams.get('role')||'TECNICO',chave=ref.search;
  if(!estados.has(chave))estados.set(chave,{lidas:new Set(),falhar:false});const estado=estados.get(chave),rota=url.pathname.slice(4);
  let dados=[];
  if(rota==='/auth/me')dados={id:1,funcionarioId:1,nome,perfil:role,deveAlterarSenha:false};
  else if(rota==='/obras')dados=obras;
  else if(rota==='/equipamentos'||rota==='/equipamentos/catalogo')dados=[{...equipamento,tipo:role==='TST'?'EPI':'Ferramentas'}];
  else if(rota==='/atividades')dados=role==='ESTOQUE'?[pedido]:[{...pedido,status:'Em trânsito',materiais:[{id:1,nome:role==='TST'?'Capacete de segurança':equipamento.modelo,quantidade:2,identificacao:'ERA-ENVIO-1'}],planoFinanceiro:[],eventosFinanceiros:[]}];
  else if(rota==='/notificacoes'){
    const vazia=ref.searchParams.get('vazia'),p=Number(url.searchParams.get('pagina')||0);
    const itens=vazia?[]:Array.from({length:21},(_,i)=>({id:i+1,solicitacaoId:i+10,obraId:1,obraNome:obras[0].nome,destinatario:i!==1,materiais:[{nome:role==='TST'?'Capacete de segurança com proteção facial':equipamento.modelo,quantidade:2}],criadaEm:'2026-10-22T10:00:00-04:00',lidaEm:estado.lidas.has(i+1)?'2026-10-22T10:10:00-04:00':null,status:'Em trânsito'}));
    dados={itens:itens.slice(p*20,(p+1)*20),naoLidas:itens.filter(i=>!i.lidaEm).length,temMais:(p+1)*20<itens.length};
  }else if(rota.endsWith('/leitura')){
    if(ref.searchParams.has('erro')&&!estado.falhar){estado.falhar=true;res.statusCode=409;dados={mensagem:'Falha temporária ao registrar a leitura.'};}
    else{const id=Number(rota.split('/')[2]);estado.lidas.add(id);dados={id,solicitacaoId:id+9,obraId:1,obraNome:obras[0].nome,destinatario:id!==2,materiais:[{nome:equipamento.modelo,quantidade:2}],criadaEm:'2026-10-22T10:00:00-04:00',lidaEm:'2026-10-22T10:10:00-04:00',status:'Em trânsito'};}
  }
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(dados));
});}}]});
await servidor.listen();const base='http://127.0.0.1:'+servidor.httpServer.address().port;
const perfil=fs.mkdtempSync(path.join(os.tmpdir(),'era-avisos-'));
const chrome=spawn(process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--no-first-run','--disable-gpu','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+perfil,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let ws;const resultados=[];let documento;
try{
  const endpoint=await new Promise((resolve,reject)=>{let saida='';const timer=setTimeout(()=>reject(Error('Chrome não iniciou')),15000);chrome.stderr.on('data',b=>{saida+=b;const m=saida.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(timer);resolve(m[1]);}});chrome.on('error',reject);});
  ws=new WebSocket(endpoint);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
  let numero=0;const pendentes=new Map();ws.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){const p=pendentes.get(m.id);if(!p)return;clearTimeout(p.timer);pendentes.delete(m.id);if(m.error)p.reject(Error(JSON.stringify(m.error)));else p.resolve(m.result);}});
  const enviar=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++numero;const timer=setTimeout(()=>{pendentes.delete(id);reject(Error('Chrome sem resposta: '+method));},20000);pendentes.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params,sessionId}));});
  let {targetId}=await enviar('Target.createTarget',{url:'about:blank'});let {sessionId}=await enviar('Target.attachToTarget',{targetId,flatten:true});
  const cdp=(method,params)=>enviar(method,params,sessionId);
  const avaliar=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const esperar=async expression=>{for(let i=0;i<120;i++){if(await avaliar(`Boolean(${expression})`))return;await new Promise(r=>setTimeout(r,80));}const diagnostico=await avaliar("JSON.stringify({url:location.href,avisos:document.querySelectorAll('[role=dialog] article').length,paginacao:document.querySelector('[aria-label=\"Páginas de notificações\"]')?.textContent,erro:document.querySelector('[role=alert]')?.textContent})");throw Error('Tempo esgotado: '+expression+' '+diagnostico);};
  const botao=texto=>`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim().startsWith(${JSON.stringify(texto)}))`;
  const tocar=async expression=>{const p=await avaliar(`(()=>{const e=${expression};if(!e||e.disabled)return null;e.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return{x,y,alcancavel:e.contains(document.elementFromPoint(x,y))};})()`);assert.ok(p?.alcancavel,'Botão alcançável: '+expression);await cdp('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await new Promise(r=>setTimeout(r,90));};
  const foto=async nome=>fs.writeFileSync(path.join(pasta,nome+'.png'),Buffer.from((await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  await cdp('Page.enable');await cdp('Runtime.enable');
  for(const largura of [320,390,768,844,1024,1440])for(const tema of ['light','dark'])for(const role of ['TECNICO','TST','ESTOQUE','GERENTE','RH','FINANCEIRO','ADMIN']){
    const altura=largura===844?390:900,caso=`${role}-${largura}-${tema}`;
    console.log(`Verificando ${caso}`);
    // Cada combinação começa em um renderer novo para não herdar foco ou rolagem da anterior.
    await enviar('Target.closeTarget',{targetId});
    ({targetId}=await enviar('Target.createTarget',{url:'about:blank'}));
    ({sessionId}=await enviar('Target.attachToTarget',{targetId,flatten:true}));
    await cdp('Page.enable');await cdp('Runtime.enable');
    const campo=['TECNICO','TST'].includes(role);
    await cdp('Emulation.setDeviceMetricsOverride',{width:largura,height:altura,deviceScaleFactor:1,mobile:false});
    await cdp('Page.navigate',{url:`${base}/__avisos?role=${role}&tema=${tema}&largura=${largura}`});await esperar('document.querySelector("main")');
    if(role==='ESTOQUE'){
      await esperar(botao('Ordem de atendimento'));await tocar(botao('Ordem de atendimento'));await esperar('window.documentos.length===1');
      documento=await avaliar('window.documentos[0]');assert.ok(documento.includes('@page{size:A4 portrait'),'Ordem em retrato');assert.ok(documento.includes('Retirar em: Residencial'),'Origem da obra legível no documento');
      await tocar(botao('Rastreabilidade PDF'));await esperar('window.documentos.length===2');assert.doesNotMatch(await avaliar('window.documentos[1]'),/Resumo por material/);
      assert.ok(await avaliar('document.documentElement.scrollWidth<=innerWidth'),'Estoque sem overflow horizontal');
    }
    await esperar('document.querySelector("[aria-label^=Notificações]")?.textContent.includes("21")');
    await tocar('document.querySelector("[aria-label^=Notificações]")');await esperar('document.querySelector("[role=dialog]")?.querySelectorAll("article").length===20');
    const medidas=await avaliar(`(()=>{const p=document.querySelector('[role=dialog]'),r=p.getBoundingClientRect();return{pagina:document.documentElement.scrollWidth,viewport:innerWidth,largura:p.clientWidth,conteudo:p.scrollWidth,top:r.top,bottom:r.bottom,altura:innerHeight,scroll:[...p.querySelectorAll('div')].some(e=>e.scrollHeight>e.clientHeight+5&&getComputedStyle(e).overflowY==='auto'),foco:document.activeElement.getAttribute('aria-label'),acoes:[...p.querySelectorAll('button')].map(e=>e.getBoundingClientRect().height)};})()`);
    assert.ok(medidas.pagina<=largura&&medidas.conteudo<=medidas.largura+1&&medidas.top>=0&&medidas.bottom<=altura,JSON.stringify({caso,...medidas}));assert.ok(medidas.scroll);assert.equal(medidas.foco,'Fechar notificações');assert.ok(medidas.acoes.every(h=>h>=40));
    const equipe=await avaliar("document.querySelectorAll('[role=dialog] article')[1].textContent");assert.match(equipe,/Entendi/);assert.doesNotMatch(equipe,/Ver entrega/);
    assert.equal(await avaliar("document.querySelectorAll('[role=dialog] article ul').length"),0,'Avisos não repetem a lista de materiais');
    assert.equal(await avaliar("document.querySelector('[role=dialog] article').querySelectorAll('button').length"),1,'Uma ação por aviso');
    if([390,1440].includes(largura))await foto(caso);
    await tocar(botao('Entendi'));await esperar('document.querySelector("[aria-label^=Notificações]")?.textContent.includes("20")');
    await tocar(botao('Próximas'));await esperar('document.querySelectorAll("[role=dialog] article").length===1');
    await tocar(botao('Anteriores'));await esperar('document.querySelectorAll("[role=dialog] article").length===20');
    const indiceLido=campo?1:0;
    // Gestores também podem ter um funcionário vinculado: a dashboard não deve oferecer confirmação de recebimento.
    assert.match(await avaliar(`document.querySelectorAll('[role=dialog] article')[${indiceLido}].textContent`),/Visto/);assert.doesNotMatch(await avaliar(`document.querySelectorAll('[role=dialog] article')[${indiceLido}].textContent`),/Entendi/);
    await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await esperar('!document.querySelector("[role=dialog]")');assert.match(await avaliar('document.activeElement.getAttribute("aria-label")'),/^Notificações/);
    if(campo){await tocar('document.querySelector("[aria-label^=Notificações]")');await tocar(botao('Ver entrega'));await esperar('!document.querySelector("[role=dialog]")');assert.ok(await avaliar('document.querySelector("[aria-current=page]").textContent.includes("Meus pedidos")'));await esperar('document.activeElement.id==="pedido-tecnico-10"');assert.match(await avaliar('document.querySelector("[aria-label^=Notificações]").textContent'),/19/);}
    else{
      if(role==='ADMIN'){await tocar(botao('Gerência'));await esperar('document.querySelector("[data-incorporado]")');assert.equal(await avaliar('document.querySelectorAll("[data-sino-notificacoes]").length'),1,'Administrador não duplica sino ao trocar de área');}
      else if(['GERENTE','RH','FINANCEIRO'].includes(role)){
        const controle="document.querySelector('[aria-label=\"Retrair barra superior\"]')";
        if(await avaliar(`${controle}?.getClientRects().length>0`)){await tocar(controle);assert.ok(await avaliar('document.querySelector("[data-sino-notificacoes]").getBoundingClientRect().height>0'),'Sino permanece disponível com barra recolhida');}
      }
    }
    resultados.push({caso,...medidas});
    if(resultados.length%14===0)console.log(`Validados ${resultados.length} cenários; último: ${caso}`);
  }
  // Erro de gravação preserva o aviso e permite repetir; caixa vazia tem mensagem útil.
  await cdp('Page.navigate',{url:`${base}/__avisos?role=TECNICO&tema=light&erro=1`});await esperar('document.querySelector("[aria-label^=Notificações]")');await tocar('document.querySelector("[aria-label^=Notificações]")');await esperar(botao('Ver entrega'));await tocar(botao('Ver entrega'));await esperar('document.querySelector("[role=alert]")');assert.match(await avaliar('document.querySelector("[aria-label^=Notificações]").textContent'),/21/);await tocar(botao('Ver entrega'));await esperar('!document.querySelector("[role=dialog]")');resultados.push({caso:'erro de leitura recuperável'});
  await cdp('Page.navigate',{url:`${base}/__avisos?role=TST&tema=light&vazia=1`});await esperar('document.querySelector("[aria-label^=Notificações]")');await tocar('document.querySelector("[aria-label^=Notificações]")');await esperar('document.querySelector("[role=dialog]")?.textContent.includes("Nenhum aviso")');resultados.push({caso:'caixa vazia'});
  // O HTML capturado vem da ação real de impressão do estoque.
  await cdp('Emulation.setDeviceMetricsOverride',{width:812,height:1120,deviceScaleFactor:1,mobile:false});
  await cdp('Page.navigate',{url:'about:blank'});const {frameTree}=await cdp('Page.getFrameTree');await cdp('Page.setDocumentContent',{frameId:frameTree.frame.id,html:documento});await esperar('[...document.images].every(i=>i.complete)');
  assert.ok(await avaliar('document.documentElement.scrollWidth<=innerWidth'),'Ordem sem overflow na impressão');await foto('ordem-atendimento');
  const pdf=Buffer.from((await cdp('Page.printToPDF',{preferCSSPageSize:true,printBackground:true})).data,'base64');fs.writeFileSync(path.join(pasta,'ordem-atendimento.pdf'),pdf);assert.match(pdf.subarray(0,8).toString(),/%PDF/);resultados.push({caso:'ordem A4 em PDF',paginas:(pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length});
  fs.writeFileSync(path.join(pasta,'relatorio.json'),JSON.stringify(resultados,null,2));console.log(JSON.stringify({cenarios:resultados.length,falhas:0,artefatos:pasta}));
}finally{ws?.close();chrome.kill();await servidor.close();}
