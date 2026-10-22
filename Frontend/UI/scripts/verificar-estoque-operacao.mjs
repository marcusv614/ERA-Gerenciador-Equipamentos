import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import { iniciarNavegador } from './lib/navegador.mjs';

process.env.VITE_API_URL='/api';
const pasta=path.resolve('node_modules/.cache/estoque-operacao');fs.mkdirSync(pasta,{recursive:true});
const obras=[{id:1,nome:'Obra A — implantação de infraestrutura e redes de telecomunicações'},{id:2,nome:'Obra B — ampliação da rede de fibra óptica e equipamentos'}];
const chave='ferramentas|chave phillips ph0|';
const material=(id,quantidade,compra,recebida=0,identificacao=null)=>({id,nome:'Chave Phillips PH0',catalogoChave:chave,quantidade,quantidadeCompra:compra,quantidadeAdquirida:recebida,quantidadeEntradaEstoque:recebida,identificacao});
const pedido=(id,m,extras={})=>({id,tipo:'Movimentação',status:'Aprovada',tecnico:'Marcus Vinicius Nunes Pinheiro',solicitante:'Maria Gerente',obraOrigemId:null,obraDestinoId:2,dataSolicitacao:'2026-10-22',materiais:[m],planoFinanceiro:[{materialId:m.id,nome:m.nome,quantidadeCompra:m.quantidadeCompra,origens:[]}],eventosFinanceiros:[{tipo:'APROVACAO',autorNome:'Carlos Financeiro',registradoEm:'2026-10-22T08:00:00-04:00'}],...extras});
const fixtures=[pedido(4,material(40,6,6,6)),pedido(5,material(50,21,21)),pedido(6,material(60,5,2,1),{planoFinanceiro:[{materialId:60,nome:'Chave Phillips PH0',origens:[{equipamentoId:100,obraOrigemId:1,identificacao:'ERA-OBRA-A',quantidade:3}]}]}),pedido(7,material(70,2,0,0,'ERA-DEP')),pedido(8,material(80,1,0,0,'ERA-ENVIO'),{status:'Em trânsito'}),pedido(9,material(90,1,0,0,'ERA-RETORNO'),{status:'Aguardando coleta',obraOrigemId:1,obraDestinoId:null}),pedido(10,material(100,1,0,0,'ERA-CONCLUIDO'),{status:'Concluída'}),pedido(11,{...material(110,1,1),nome:'OTDR',catalogoChave:'otdr|otdr|'})];
const estados=new Map();
const html=(tema,incorporado)=>`<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">import React from'react';import{createRoot}from'react-dom/client';import{ProvedorAutenticacao,useAutenticacao}from'/src/contexto/ContextoAutenticacao.jsx';import{PainelEstoque}from'/src/components/estoque/PainelEstoque.jsx';import'/src/index.css';window.documentos=[];window.open=()=>({document:{write:h=>window.documentos.push(h),close:()=>{},images:[]},focus:()=>{},print:()=>{}});function Pagina(){const{usuario}=useAutenticacao();return usuario?React.createElement(PainelEstoque,{temaEscuro:${tema==='dark'},incorporado:${incorporado}}):null;}createRoot(document.getElementById('root')).render(React.createElement(ProvedorAutenticacao,null,React.createElement(Pagina)));</script></body></html>`;
const servidor=await createServer({server:{host:'127.0.0.1',port:0},plugins:[{name:'estoque-operacao',configureServer(s){s.middlewares.use(async(req,res,next)=>{
  const url=new URL(req.url,'http://localhost');if(url.pathname==='/__estoque'){res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml(req.url,html(url.searchParams.get('tema'),url.searchParams.get('incorporado')==='1')));return;}
  if(!url.pathname.startsWith('/api/'))return next();const ref=new URL(req.headers.referer||'http://localhost'),id=ref.search;
  if(!estados.has(id))estados.set(id,{pedidos:structuredClone(fixtures),envios:[],falhou:false});const estado=estados.get(id),rota=url.pathname.slice(4);let dados;
  if(req.method==='POST'){
    const partes=[];for await(const parte of req)partes.push(parte);const corpo=Buffer.concat(partes).toString(),enviado=corpo?JSON.parse(corpo):{};estado.envios.push({rota,dados:enviado});await new Promise(r=>setTimeout(r,350));const p=estado.pedidos.find(p=>p.id===Number(rota.split('/')[2]));
    if(ref.searchParams.get('erro')==='1'&&!estado.falhou&&rota.endsWith('/execucao-plano')){estado.falhou=true;res.statusCode=409;dados={mensagem:'O saldo mudou. Confira os materiais e tente novamente.'};}
    else if(rota.endsWith('/inicio-atendimento')){p.eventosFinanceiros.push({tipo:'INICIO_ATENDIMENTO'});dados=p;}
    else if(rota.endsWith('/aquisicao')){p.materiais[0].quantidadeEntradaEstoque+=enviado.quantidade;p.materiais[0].quantidadeAdquirida+=enviado.quantidade;dados=p;}
    else if(rota.endsWith('/execucao-plano')){p.materiais.forEach(m=>m.identificacao='ERA-SEPARADO');dados=[p];}
    else if(rota.endsWith('/transito')){p.status='Em trânsito';dados=p;}
    else if(rota.endsWith('/conclusao')){p.status='Concluída';dados=p;}
    else if(rota.endsWith('/atendimento-parcial')){const saldo=structuredClone(p);saldo.id=106;saldo.solicitacaoPaiId=p.id;saldo.materiais[0].quantidade=2;p.materiais[0].quantidade=3;p.materiais[0].identificacao='ERA-OBRA-A';p.obraOrigemId=1;estado.pedidos.push(saldo);dados=[p,saldo];}
    else throw Error('Mutação inesperada: '+rota);
  }else if(rota==='/auth/me')dados={id:1,nome:'Equipe do estoque',perfil:'ESTOQUE',deveAlterarSenha:false};
  else if(rota==='/auth/csrf')dados={token:'fixture'};
  else if(rota==='/obras')dados=obras;
  else if(rota==='/equipamentos')dados=[];
  else if(rota==='/atividades')dados=estado.pedidos;
  else if(rota==='/notificacoes')dados={itens:[],naoLidas:0,temMais:false};
  else{res.statusCode=404;dados={mensagem:'Rota não simulada: '+rota};}
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(dados));
});}}]});
await servidor.listen();const base='http://127.0.0.1:'+servidor.httpServer.address().port;let navegador;const resultados=[];
try{
  navegador=await iniciarNavegador();const {abrir,avaliar,esperar,tocar,preencher,botao,cdp}=navegador;
  const q=seletor=>`document.querySelector(${JSON.stringify(seletor)})`;
  const inspecionar=async nome=>{const r=await avaliar(`(()=>{const d=document.querySelector('[role=dialog]'),r=d?.getBoundingClientRect();return{pagina:document.documentElement.scrollWidth<=innerWidth+1,janela:!d||(d.scrollWidth<=d.clientWidth+1&&r.top>=0&&r.bottom<=innerHeight+1)};})()`);assert.ok(r.pagina&&r.janela,nome+': '+JSON.stringify(r));resultados.push({nome,...r});};
  for(const largura of [320,390,768,844,1024,1440])for(const tema of ['light','dark']){
    const nome=`estoque-${largura}-${tema}`,url=`${base}/__estoque?largura=${largura}&tema=${tema}`;
    await abrir(url,largura,largura===844?390:900);await esperar(q('[aria-label="Atender pedido 4"]'));
    assert.ok(!await avaliar(`Boolean(${q('[aria-label="Atender pedido 8"]')})`),'Enviados ficam fora da fila para atender');
    const ids=await avaliar(`Array.from(document.querySelectorAll('[aria-label^="Atender pedido "]')).map(e=>e.getAttribute('aria-label'))`);assert.equal(ids[0],'Atender pedido 7','Pedidos prontos vêm primeiro');
    await inspecionar(nome+'-fila');if([390,1440].includes(largura)&&tema==='light')fs.writeFileSync(path.join(pasta,nome+'-fila.png'),Buffer.from((await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
    await tocar(q('[aria-label="Atender pedido 6"]'));await esperar(q('[role=dialog]'));assert.match(await avaliar('document.querySelector("[role=dialog]").innerText'),/Obra A/);assert.match(await avaliar('document.querySelector("[role=dialog]").innerText'),/Depósito central/);await inspecionar(nome+'-detalhes');
    if([390,1440].includes(largura))fs.writeFileSync(path.join(pasta,nome+'-detalhes.png'),Buffer.from((await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
    await tocar(botao('Registrar compra'));await esperar(q('input[type=number]'));await inspecionar(nome+'-compra');await preencher(q('input[type=number]'),'999');assert.equal(await avaliar('document.querySelector("input[type=number]").value'),'1','Quantidade não excede o saldo');await tocar(botao('Cancelar'));await esperar(q('[aria-label="Pedido #0006"]'));
    await tocar(botao('Ajustar envio'));await esperar(q('textarea'));await inspecionar(nome+'-parcial');await tocar(botao('Cancelar'));await esperar(q('[aria-label="Pedido #0006"]'));
    await tocar(q('details summary'));await tocar(botao('Ordem de atendimento'));await esperar('window.documentos.length===1');await tocar(botao('Fechar pedido'));
    await tocar(q('[aria-label="Atender pedido 4"]'));await esperar(botao('Confirmar separação'));assert.ok(!await avaliar(`Boolean(${botao('Registrar compra')})`),'Compra totalmente recebida não reaparece como pendência');await tocar(botao('Confirmar separação'));await esperar(botao('Confirmar envio'));await tocar(botao('Confirmar envio'));await esperar(`document.querySelector('[role=dialog]').innerText.includes('O técnico precisa confirmar')`);assert.ok(!await avaliar(`Boolean(${botao('Confirmar recebimento')})`));await tocar(botao('Fechar pedido'));
    await tocar(botao('Enviados'));await esperar(q('[aria-label="Atender pedido 4"]'));await tocar(botao('Para atender'));await esperar(q('[aria-label="Atender pedido 5"]'));
    await preencher(q('[aria-label="Pesquisar no estoque"]'),'#0006');await esperar(`document.querySelectorAll('[aria-label^="Atender pedido "]').length===1`);await preencher(q('[aria-label="Pesquisar no estoque"]'),'');
    await avaliar(`(()=>{const e=${q('[aria-label="Filtrar estoque por obra"]')};e.value='1';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await esperar(q('[aria-label="Atender pedido 6"]'));assert.ok(!await avaliar(`Boolean(${q('[aria-label="Atender pedido 5"]')})`),'Filtro inclui obras de retirada do plano');
    console.log('Validado '+nome);
  }
  for(const largura of [390,1440]){
    const url=`${base}/__estoque?tema=light&fluxo=compra&incorporado=1&largura=${largura}`;await abrir(url,largura);await esperar(q('[aria-label="Atender pedido 5"]'));await tocar(q('[aria-label="Atender pedido 5"]'));await tocar(botao('Registrar compra'));await esperar(q('input[type=number]'));await preencher(q('input[type=number]'),'6');await preencher(q('input[placeholder="Número da nota fiscal"]'),'NF-PARCIAL');await tocar(botao('Registrar entrada'));await avaliar(`${botao('Registrando')}.click()`);await esperar(q('[aria-label="Pedido #0005"]'));assert.match(await avaliar('document.querySelector("[role=dialog]").innerText'),/15 un. pendentes da compra/);
    await tocar(botao('Registrar compra'));await esperar(q('input[type=number]'));await preencher(q('input[placeholder="Número da nota fiscal"]'),'NF-SALDO');await tocar(botao('Registrar entrada'));await esperar(botao('Confirmar separação'));await inspecionar(`compra-parcial-${largura}`);const envios=estados.get(new URL(url).search).envios;assert.deepEqual(envios.filter(e=>e.rota.endsWith('/aquisicao')).map(e=>e.dados.quantidade),[6,15]);
    await tocar(botao('Fechar pedido'));await tocar(q('[aria-label="Atender pedido 9"]'));await tocar(botao('Confirmar recebimento'));await esperar(`document.querySelector('[role=dialog]').innerText.includes('Recebimento confirmado')`);await tocar(botao('Fechar pedido'));
    await tocar(q('[aria-label="Atender pedido 11"]'));await tocar(botao('Registrar compra'));await esperar(q('input[placeholder="Identificação do equipamento"]'));assert.ok(await avaliar(`${botao('Registrar entrada')}.disabled`));await tocar(botao('Cancelar'));await tocar(botao('Fechar pedido'));
    await tocar(q('[aria-label="Atender pedido 6"]'));await tocar(botao('Ajustar envio'));await esperar(q('textarea'));await preencher(q('textarea'),'Enviar somente o material disponível na Obra A.');await tocar(botao('Separar itens selecionados'));await esperar(botao('Confirmar envio'));assert.equal(estados.get(new URL(url).search).envios.find(e=>e.rota.endsWith('/atendimento-parcial')).dados.materiais[0].origens[0].quantidade,3);await inspecionar(`envio-parcial-${largura}`);
  }
  await abrir(`${base}/__estoque?tema=light&erro=1`,390);await esperar(q('[aria-label="Atender pedido 4"]'));await tocar(q('[aria-label="Atender pedido 4"]'));await tocar(botao('Confirmar separação'));await esperar(q('[role=alert]'));assert.match(await avaliar('document.querySelector("[role=alert]").innerText'),/O saldo mudou/);await inspecionar('erro-da-api');await tocar(botao('Confirmar separação'));await esperar(botao('Confirmar envio'));
  fs.writeFileSync(path.join(pasta,'relatorio.json'),JSON.stringify(resultados,null,2));console.log(JSON.stringify({cenarios:resultados.length,falhas:0,artefatos:pasta}));
}finally{navegador?.fechar();await servidor.close();}
