// Verificação visual isolada: usa componentes reais, dados fictícios e Chrome com perfil temporário.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';
process.env.VITE_API_URL='/api';
const baseline=process.argv.includes('--baseline');
const apenasCalibracao=process.argv.includes('--calibracao');
const movimentacoesEnviadas=[];
const artefatos=path.resolve('node_modules/.cache/layout-paineis');fs.mkdirSync(artefatos,{recursive:true});
const nome='Marcus Vinicius Nunes Pinheiro da Silva Oliveira';
const obras=[{id:1,nome:'Residencial Santa Maria — infraestrutura e implantação da rede de fibra óptica no bloco administrativo',cidade:'Manaus',status:'Em andamento',responsaveis:[nome]},{id:2,nome:'AMPLIACAO_DA_INFRAESTRUTURA_DE_REDE_ELETRICA_E_TELECOMUNICACOES_BLOCO_B',cidade:'Manaus',status:'Em andamento',responsaveis:[nome]}];
const modelos=['Equipamento de medição de potência óptica com acessórios e maleta de transporte','CHAVE_PHILLIPS_PARA_MANUTENCAO_E_INSTALACAO_DE_EQUIPAMENTOS_PROFISSIONAIS','Escada extensível de alumínio com plataforma e trava de segurança'];
const equipamentos=Array.from({length:6},(_,i)=>({id:i+1,tipo:i===0?'OTDR':'Ferramentas',modelo:modelos[i%3],serie:'ERA-'+String(i+1)+'-IDENTIFICACAO-COMPRIDA-PARA-RASTREAMENTO-DE-EQUIPAMENTO-2026',catalogoChave:`catalogo-${i%3}`,obraId:i%2?null:1,tecnico:i%2?null:nome,status:i%2?'Em estoque':'Em campo',quantidade:12,quantidadeDisponivel:10,quantidadeReservada:1,quantidadeManutencao:1,auditavel:true,manutencoes:[],historico:[]}));
const fluke={id:70,tipo:'Fluke',modelo:'DSX-5000 Fluke para certificação de redes de telecomunicações',serie:'FLUKE-70',catalogoChave:'fluke|dsx-5000|',obraId:1,tecnico:nome,status:'Em campo',quantidade:1,quantidadeDisponivel:1,quantidadeReservada:0,quantidadeManutencao:0,quantidadeCalibracao:0,controleQuantidade:'INDIVIDUAL',auditavel:true,manutencoes:[],calibracoes:[],historico:[]};
equipamentos.push(fluke);
const material=(n,quantidade=2,separado=false)=>({id:n+1,nome:equipamentos[n].modelo,catalogoChave:equipamentos[n].catalogoChave,quantidade,identificacao:separado?equipamentos[n].serie:null,quantidadeCompra:n===0?3:0,quantidadeAdquirida:0,quantidadeEntradaEstoque:0});
const pedidos=['Aprovada','Aprovada','Em trânsito','Aguardando coleta','Pendente','Concluída','Rejeitada'].map((status,i)=>({id:i+1,tipo:'Movimentação',status,tecnico:nome,solicitante:'Gerente responsável pela mobilização emergencial de materiais e equipes',solicitanteLogin:'gerente',solicitantePerfil:'GERENTE',obraOrigemId:i>1?1:null,obraDestinoId:i===3?null:2,dataSolicitacao:'2026-10-19',materiais:[material(0,i===1?25:3,i>1),material(1,2,i>1)]}));
const funcionarios=[{id:1,nome,cargo:'Técnico de telecomunicações e infraestrutura',email:'marcus.vinicius.tecnico.responsavel@empresa-de-telecomunicacoes.com.br',telefone:'92912345678',status:'Ativo'}];
const auditoria={id:1,versao:0,funcionarioId:1,tecnicoNome:nome,status:'ABERTA',criadoEm:'2026-10-19T10:00:00-04:00',criadoPorNome:'Gerente',criadoPorLogin:'gerente',itens:equipamentos.filter(e=>e.obraId).map(e=>({equipamentoId:e.id,tipo:e.tipo,modelo:e.modelo,serie:e.serie,obraId:1,local:obras[0].nome,quantidade:10,bom:0,avaria:0,quebrado:0}))};
const pagina=role=>`<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
import React from 'react';import{createRoot}from'react-dom/client';import{ProvedorAutenticacao,useAutenticacao}from'/src/contexto/ContextoAutenticacao.jsx';
import{PainelTecnico}from'/src/components/tecnico/PainelTecnico.jsx';import{PainelEstoque}from'/src/components/estoque/PainelEstoque.jsx';import{PainelControleAtivos}from'/src/components/painel/PainelControleAtivos.jsx';import{PainelAdmin}from'/src/components/admin/PainelAdmin.jsx';import'/src/index.css';
for(const k of ['era-tema-tecnico','era-tema-estoque','era-tema-gerente','era-tema-admin'])localStorage.setItem(k,'claro');
function Pagina(){const{usuario}=useAutenticacao();return usuario?React.createElement(({tecnico:PainelTecnico,estoque:PainelEstoque,gerencia:PainelControleAtivos,admin:PainelAdmin})['${role}']):null;}
createRoot(document.getElementById('root')).render(React.createElement(ProvedorAutenticacao,null,React.createElement(Pagina)));
</script></body></html>`;
const servidor=await createServer({server:{host:'127.0.0.1',port:0},plugins:[{name:'layout-fixtures',configureServer(s){s.middlewares.use(async(req,res,next)=>{
  if(req.url.startsWith('/__layout')){const role=new URL(req.url,'http://localhost').searchParams.get('role');res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml(req.url,pagina(role)));return;}
  if(!req.url.startsWith('/api/'))return next();
  const role=new URL(req.headers.referer||'http://localhost').searchParams.get('role')||'gerencia';
  let dados=[];const rota=req.url.split('?')[0].slice(4);
  if(rota==='/auth/me')dados={id:1,funcionarioId:1,nome,perfil:({tecnico:'TECNICO',estoque:'ESTOQUE',gerencia:'GERENTE',admin:'ADMIN'})[role],deveAlterarSenha:false};
  else if(rota==='/obras')dados=obras;
  else if(rota==='/equipamentos')dados=equipamentos;
  else if(rota==='/equipamentos/catalogo')dados=equipamentos.slice(0,3);
  else if(rota==='/atividades')dados=pedidos;
  else if(rota==='/funcionarios')dados=funcionarios;
  else if(rota==='/categorias-equipamento')dados=[{id:1,nome:'Ferramentas',campos:[]},{id:2,nome:'OTDR',campos:[]}];
  else if(rota==='/usuarios')dados=[{id:1,nome,login:'tecnico',perfil:'TECNICO',funcionarioId:1,ativo:true,deveAlterarSenha:false}];
  else if(rota.endsWith('/auditorias/materiais'))dados=auditoria.itens;
  else if(rota==='/auditorias'||rota.endsWith('/auditorias'))dados=[auditoria];
  else if(rota.includes('/auditorias/'))dados=auditoria;
  if(req.method==='POST'&&rota.endsWith('/conclusao'))dados={...pedidos.find(p=>p.id===Number(rota.split('/')[2])),status:'Concluída'};
  if(req.method==='POST'&&rota==='/atividades'){
    const partes=[];for await(const parte of req)partes.push(parte);
    const pedido=JSON.parse(Buffer.concat(partes).toString());movimentacoesEnviadas.push(pedido);
    await new Promise(r=>setTimeout(r,350));
    const largura=new URL(req.headers.referer).searchParams.get('largura');
    if(!pedido.tecnico){res.statusCode=400;dados={mensagem:'Existem campos inválidos.',detalhes:{tecnico:'não deve estar em branco'}};}
    else if(largura==='320'){res.statusCode=409;dados={mensagem:'O saldo mudou. Atualize os equipamentos e tente novamente.'};}
    else dados={...pedido,id:900,status:'Aguardando coleta',tipo:'Movimentação',solicitante:'Gerente',materiais:pedido.materiais.map((m,i)=>({...m,id:i+1}))};
  }
  if(req.method==='POST'&&rota.startsWith('/equipamentos/70/calibracoes')){
    const partes=[];for await(const parte of req)partes.push(parte);const corpo=JSON.parse(Buffer.concat(partes).toString());
    const hoje=new Date().toLocaleDateString('en-CA'),c=fluke.calibracoes[0];
    const evento=acao=>({acao,registradoEm:new Date().toISOString(),autorNome:nome,autorLogin:role,autorPerfil:role==='estoque'?'ESTOQUE':'GERENTE'});
    if(rota==='/equipamentos/70/calibracoes'){fluke.calibracoes=[{id:1,status:'AGUARDANDO_RETIRADA',modelo:fluke.modelo,serie:fluke.serie,localOrigem:obras[0].nome,tecnicoOrigem:nome,obraOrigemId:1,laboratorio:corpo.laboratorio,observacao:corpo.observacao,criadoEm:new Date().toISOString(),eventos:[evento('SOLICITADA')]}];fluke.quantidadeDisponivel=0;fluke.quantidadeCalibracao=1;}
    else if(rota.endsWith('/retirada')){c.status='AGUARDANDO_ENVIO';c.dataRetirada=corpo.dataRetirada;fluke.obraId=null;fluke.tecnico=null;fluke.status='Aguardando calibração';c.eventos.push(evento('RETIRADA_CONFIRMADA'));}
    else if(rota.endsWith('/envio')){c.status='EM_CALIBRACAO';Object.assign(c,corpo);fluke.status='Em calibração';c.eventos.push(evento('ENVIO_CONFIRMADO'));}
    else if(rota.endsWith('/retorno')){c.status='CONCLUIDA';Object.assign(c,corpo);fluke.status='Em estoque';fluke.quantidadeDisponivel=1;fluke.quantidadeCalibracao=0;c.eventos.push(evento('RETORNO_CONFIRMADO'));}
    else if(rota.endsWith('/certificados')){fluke.calibracoes.push({...corpo,id:2,status:'CONCLUIDA',historico:true,modelo:fluke.modelo,serie:fluke.serie,localOrigem:'Depósito central',criadoEm:hoje,eventos:[evento('CERTIFICADO_ANTERIOR')]});}
    dados=fluke;
  }
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(dados));
});}}]});
await servidor.listen();const base='http://127.0.0.1:'+servidor.httpServer.address().port;
const perfil=fs.mkdtempSync(path.join(os.tmpdir(),'era-layout-'));
const chrome=spawn(process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--no-first-run','--disable-gpu','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+perfil,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let ws;const resultados=[];
try{
  const endpoint=await new Promise((r,j)=>{let out='';const t=setTimeout(()=>j(Error('Chrome nao iniciou')),15000);chrome.stderr.on('data',b=>{out+=b;const m=out.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(t);r(m[1]);}});chrome.on('error',j);});
  ws=new WebSocket(endpoint);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});let id=0;const pendentes=new Map();
  ws.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){const p=pendentes.get(m.id);pendentes.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}});
  const enviar=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const n=++id;pendentes.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params,sessionId}));});
  const{targetId}=await enviar('Target.createTarget',{url:'about:blank'}),{sessionId}=await enviar('Target.attachToTarget',{targetId,flatten:true});const cdp=(m,p)=>enviar(m,p,sessionId);
  const avaliar=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const esperar=async expression=>{for(let n=0;n<140;n++){if(await avaliar(`Boolean(${expression})`))return;await new Promise(r=>setTimeout(r,80));}throw Error('Tempo esgotado: '+expression);};
  const tocar=async expression=>{const ponto=await avaliar(`(()=>{const e=${expression};if(!e||e.disabled)return null;e.scrollIntoView({behavior:'instant',block:'center',inline:'nearest'});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return{x,y,alcancavel:e.contains(document.elementFromPoint(x,y))};})()`);assert.ok(ponto,'Botao disponivel: '+expression);assert.ok(ponto.alcancavel,'Botao encoberto: '+expression);const{x,y}=ponto;await cdp('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});await new Promise(r=>setTimeout(r,100));};
  const escapar=async()=>{await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});await esperar("!document.querySelector('[role=dialog]')");};
  const botao=(texto,raiz='document')=>`Array.from(${raiz}.querySelectorAll('button')).find(b=>b.getBoundingClientRect().height&&(b.textContent.trim().startsWith(${JSON.stringify(texto)})||b.querySelector('small')?.textContent.trim()===${JSON.stringify(texto)}))`;
  const inspecionar=async(nome,imagem=false)=>{
    const m=await avaliar(`(()=>{const visivel=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&r.right>0&&s.visibility!=='hidden'&&s.clipPath!=='inset(50%)'&&!e.closest('[aria-hidden=true],[inert]');};const problemas=Array.from(document.querySelectorAll('main *,[role=dialog] *')).filter(e=>!['svg','path','circle','select','input','textarea','option'].includes(e.tagName.toLowerCase())&&visivel(e)&&e.clientWidth>0&&e.scrollWidth>e.clientWidth+2&&!['auto','scroll'].includes(getComputedStyle(e).overflowX)&&getComputedStyle(e).textOverflow!=='ellipsis').map(e=>({tag:e.tagName,classe:String(e.className),largura:e.clientWidth,conteudo:e.scrollWidth,texto:e.textContent.slice(0,100)}));return{viewport:innerWidth,pagina:document.documentElement.scrollWidth,problemas:problemas.slice(-12)};})()`);
    resultados.push({nome,...m});if(imagem)fs.writeFileSync(path.join(artefatos,`${baseline?'antes':'depois'}-${nome}.png`),Buffer.from((await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  };
  await cdp('Page.enable');await cdp('Runtime.enable');
  if(!apenasCalibracao)for(const largura of [320,390,768,844,1024,1440])for(const role of ['tecnico','estoque','gerencia','admin']){
    await cdp('Emulation.setDeviceMetricsOverride',{width:largura,height:largura===844?390:largura<768?844:1000,deviceScaleFactor:1,mobile:largura<768||largura===844});
    await cdp('Page.navigate',{url:`${base}/__layout?role=${role}&largura=${largura}`});
    try{
      await esperar(role==='tecnico'?"Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim().startsWith('Receber material'))":role==='estoque'?"document.querySelector('[aria-label^=\"Atender pedido \"]')":role==='admin'?"document.querySelector('input[aria-label=\"Pesquisar usuários\"]')":"document.querySelector('[aria-label=\"Visualização dos equipamentos\"]')");
      await inspecionar(`${role}-${largura}-inicio`,largura===390);
      if(role==='tecnico'){
        await tocar(botao('Receber material'));await tocar(botao(obras[0].nome));await tocar(botao('Continuar'));await inspecionar(`${role}-${largura}-catalogo`,largura===390||largura===1440);
        await tocar("document.querySelector('[class*=selecionarMaterial]')");await tocar(botao('Revisar'));await inspecionar(`${role}-${largura}-revisao`);
        await tocar(botao('Meus pedidos'));await inspecionar(`${role}-${largura}-pedidos`);
        await tocar(botao('Materiais'));await inspecionar(`${role}-${largura}-materiais`);
      }else if(role==='estoque'){
        await tocar("document.querySelector('[aria-label^=\"Atender pedido \"]')");await esperar("document.querySelector('[role=dialog]')");await inspecionar(`${role}-${largura}-pedido`,largura===390);await tocar("document.querySelector('[aria-label=Fechar]')");
        await tocar(botao('Compras'));await inspecionar(`${role}-${largura}-compras`,largura===390);
        await tocar(botao('Manutenção'));await inspecionar(`${role}-${largura}-manutencao`);await tocar(botao('Gerenciar manutenção'));await inspecionar(`${role}-${largura}-modal-manutencao`);await escapar();
        await tocar(botao('Histórico'));await inspecionar(`${role}-${largura}-historico`);
      }else if(role==='gerencia'){
        if(largura>768)await tocar(botao('Lista',"document.querySelector('[aria-label=\"Visualização dos equipamentos\"]')"));await inspecionar(`${role}-${largura}-lista`);
        await esperar("document.querySelector('button[aria-label^=\"Histórico de\"]')");await tocar("document.querySelector('button[aria-label^=\"Histórico de\"]')");await esperar("document.querySelector('[role=dialog]')");await inspecionar(`${role}-${largura}-historico-equipamento`);await escapar();
        await tocar("document.querySelector('button[aria-label^=\"Mover \"]')");await esperar("document.querySelector('[role=dialog]')");await inspecionar(`${role}-${largura}-mover`);
        if([320,390,1440].includes(largura)){
          await avaliar("(()=>{const s=document.querySelector('[role=dialog] select');s.value='';s.dispatchEvent(new Event('change',{bubbles:true}));})()");
          assert.equal(await avaliar("document.querySelector('[role=dialog] [class*=responsavel]').textContent"),nome,'Retorno mantém o técnico de origem');
          await tocar(botao('Enviar solicitação',"document.querySelector('[role=dialog]')"));
          assert.ok(await avaliar("Array.from(document.querySelectorAll('[role=dialog] button')).some(b=>b.disabled&&b.textContent.includes('Enviando'))"),'Bloqueia reenvio enquanto aguarda a API');
          if(largura===320){await esperar("document.querySelector('[role=dialog] [role=alert]')");assert.match(await avaliar("document.querySelector('[role=dialog] [role=alert]').textContent"),/O saldo mudou/);await inspecionar(`${role}-${largura}-mover-erro`);await escapar();}
          else await esperar("!document.querySelector('[role=dialog]')");
        }else await escapar();
        if(largura>768)await tocar(botao('Cartões',"document.querySelector('[aria-label=\"Visualização dos equipamentos\"]')"));
        if(largura<=768){assert.equal(await avaliar("getComputedStyle(document.querySelector('aside')).display"),'none');await tocar(botao('Obras',"document.querySelector('[aria-label=\"Navegação principal\"]')"));await inspecionar(`${role}-${largura}-obras`);await tocar(botao('Vistorias',"document.querySelector('[aria-label=\"Navegação principal\"]')"));await inspecionar(`${role}-${largura}-vistorias`);}
        else{await tocar("document.querySelector('[aria-label=\"Recolher menu lateral\"]')");await inspecionar(`${role}-${largura}-sidebar-fechada`);await tocar("document.querySelector('[aria-label=\"Expandir menu lateral\"]')");}
        for(const area of ['funcionarios','atividades','deposito']){
          const rotulo=({funcionarios:largura<=768?'Equipe':'Funcionários',atividades:'Atividades',deposito:'Depósito'})[area];
          await tocar(botao(rotulo,largura<=768?"document.querySelector('[aria-label=\"Navegação principal\"]')":"document.querySelector('aside')"));await inspecionar(`${role}-${largura}-${area}`);
          if(area==='atividades'){
            await tocar("document.querySelector('button[aria-controls^=pedidos-tecnico]')");
            await tocar("document.querySelector('button[aria-label^=\"Abrir solicitação 5,\"]')");await esperar("document.querySelector('[role=dialog]')");await inspecionar(`${role}-${largura}-pedido`);await tocar(botao('Editar',"document.querySelector('[role=dialog]')"));await esperar("document.querySelector('[aria-label=\"Editar solicitação\"]')");await inspecionar(`${role}-${largura}-editar-pedido`);await escapar();
          }
        }
        if(largura===390){
          await tocar("document.querySelector('button[aria-label=\"Ativar tema escuro\"]')");await inspecionar(`${role}-${largura}-tema-escuro`,true);
          await cdp('Emulation.setDeviceMetricsOverride',{width:1024,height:800,deviceScaleFactor:1,mobile:false});await esperar("document.querySelector('[aria-label=\"Expandir menu lateral\"]')");await tocar("document.querySelector('[aria-label=\"Expandir menu lateral\"]')");await inspecionar(`${role}-${largura}-apos-redimensionar`);
        }
      }else if(role==='admin'){
        await tocar(botao('Gerência'));await esperar("document.querySelector('[aria-label=\"Visualização dos equipamentos\"]')");await inspecionar(`${role}-${largura}-gerencia`);
        if(largura<=768){await tocar(botao('Ações'));await inspecionar(`${role}-${largura}-acoes`);await tocar(botao('Equipamento',"document.querySelector('#acoes-rapidas-mobile')"));await esperar("document.querySelector('[role=dialog]')");await inspecionar(`${role}-${largura}-cadastro`);await tocar("document.querySelector('[aria-label=Fechar]')");}
        await tocar(botao('Estoque',"document.querySelector('nav[aria-label=\"Áreas administrativas\"]')"));await esperar("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Ver disponibilidade'))");await inspecionar(`${role}-${largura}-estoque`);
        if(largura<=640){
          await avaliar("window.scrollTo({top:650,behavior:'instant'})");await new Promise(r=>setTimeout(r,100));
          assert.ok(await avaliar("document.querySelector('[data-incorporado=true] [class*=abas]').getBoundingClientRect().top>=document.querySelector('header').getBoundingClientRect().bottom"),'Abas do estoque abaixo da barra administrativa');
          await tocar(botao('Compras',"document.querySelector('[data-incorporado=true] [class*=abas]')"));await inspecionar(`${role}-${largura}-estoque-rolagem`);
        }
        await tocar(botao('Técnico',"document.querySelector('nav[aria-label=\"Áreas administrativas\"]')"));await esperar("document.querySelector('[data-administrador=true]')");await inspecionar(`${role}-${largura}-tecnico`);
      }
    }catch(e){resultados.push({nome:`${role}-${largura}-interacao`,erro:e.message});console.error(`${role}-${largura}: ${e.message}`);}
  }
  if(apenasCalibracao){
    const preencher=async(rotulo,valor)=>{await avaliar(`(()=>{const label=Array.from(document.querySelectorAll('[role=dialog] label')).find(l=>l.textContent.trim().startsWith(${JSON.stringify(rotulo)}));const campo=label?.querySelector('input,textarea');if(!campo)throw Error('Campo ausente: '+${JSON.stringify(rotulo)});Object.getOwnPropertyDescriptor(campo.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(campo,${JSON.stringify(valor)});campo.dispatchEvent(new Event('input',{bubbles:true}));campo.dispatchEvent(new Event('change',{bubbles:true}));})()`);};
    const navegar=async(role,largura)=>{await cdp('Page.navigate',{url:`${base}/__layout?role=${role}&largura=${largura}`});if(role==='estoque'){await esperar(botao('Manutenção'));await tocar(botao('Manutenção'));}await esperar(role==='estoque'?"Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Gerenciar calibração')":"document.querySelector('button[aria-label^=\"Calibração de\"]')");};
    const noModal=texto=>botao(texto,"document.querySelector('[role=dialog]')");
    for(const largura of [320,390,844,1440]){
      Object.assign(fluke,{obraId:1,tecnico:nome,status:'Em campo',quantidadeDisponivel:1,quantidadeCalibracao:0,calibracoes:[]});
      await cdp('Emulation.setDeviceMetricsOverride',{width:largura,height:largura===844?390:844,deviceScaleFactor:1,mobile:largura<768||largura===844});
      try{
        await navegar('gerencia',largura);await tocar("document.querySelector('button[aria-label^=\"Calibração de\"]')");await esperar("document.querySelector('[role=dialog]')");await inspecionar(`calibracao-${largura}-solicitar`,largura===390);
        await preencher('Laboratório previsto','Laboratório de metrologia e certificação de instrumentos');
        await tocar("Array.from(document.querySelectorAll('[role=dialog] button')).find(b=>b.textContent==='Solicitar calibração'&&b.className.includes('primario'))");
        await esperar("document.querySelector('[role=dialog]').textContent.includes('Aguardando retirada da obra')");
        assert.equal(fluke.obraId,1);assert.equal(fluke.quantidadeDisponivel,0);assert.ok(!await avaliar("Array.from(document.querySelectorAll('[role=dialog] button')).some(b=>b.textContent==='Confirmar retirada e chegada ao depósito')"));
        await inspecionar(`calibracao-${largura}-gerente-aguardando`);await escapar();
        await navegar('estoque',largura);await inspecionar(`calibracao-${largura}-fila-estoque`,largura===390);await tocar(botao('Gerenciar calibração'));
        await tocar(noModal('Confirmar retirada e chegada ao depósito'));await esperar("Array.from(document.querySelectorAll('[role=dialog] button')).some(b=>b.textContent==='Confirmar envio ao laboratório')");assert.equal(fluke.obraId,null);
        await inspecionar(`calibracao-${largura}-envio`,largura===390);await tocar(noModal('Confirmar envio ao laboratório'));await esperar("Array.from(document.querySelectorAll('[role=dialog] button')).some(b=>b.textContent.includes('Confirmar retorno e certificado'))");
        await inspecionar(`calibracao-${largura}-retorno`,largura===390);await preencher('Número do certificado','CAL-2026-70');await preencher('Validade conforme o certificado','2027-07-20');
        await tocar(noModal('Confirmar retorno e certificado'));await esperar("document.querySelector('[role=dialog]').textContent.includes('Calibração válida até')");
        assert.equal(fluke.status,'Em estoque');assert.equal(fluke.quantidadeDisponivel,1);assert.equal(fluke.calibracoes[0].certificado,'CAL-2026-70');
        await inspecionar(`calibracao-${largura}-concluida`,largura===390);await escapar();
      }catch(e){resultados.push({nome:`calibracao-${largura}-interacao`,erro:e.message});}
    }
  }
  const falhas=resultados.filter(r=>r.erro||r.pagina>r.viewport+1||r.problemas?.length);
  if(!baseline&&!apenasCalibracao){assert.equal(movimentacoesEnviadas.length,3);for(const pedido of movimentacoesEnviadas){assert.equal(pedido.tecnico,nome);assert.equal(pedido.obraOrigemId,1);assert.equal(pedido.obraDestinoId,null);assert.equal(pedido.materiais[0].quantidade,1);}}
  fs.writeFileSync(path.join(artefatos,`${apenasCalibracao?'calibracao':baseline?'antes':'depois'}-relatorio.json`),JSON.stringify(resultados,null,2));
  console.log(JSON.stringify({cenarios:resultados.length,falhas:falhas.map(f=>({nome:f.nome,pagina:f.pagina,viewport:f.viewport,problemas:f.problemas,erro:f.erro})),artefatos},null,2));
  if(!baseline)assert.equal(falhas.length,0,'Corrigir os cenarios detalhados no relatorio');
  await enviar('Browser.close');
}finally{try{ws?.close();}catch{}chrome.kill();await servidor.close();}
