// Componentes reais, API fictícia e perfil temporário do Chrome. Não altera o banco.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import { iniciarNavegador } from './lib/navegador.mjs';
process.env.VITE_API_URL='/api';
const nome='Ana Carolina Ferreira de Albuquerque',obra='AMPLIACAO_DA_INFRAESTRUTURA_DE_REDE_ELETRICA_E_TELECOMUNICACOES_BLOCO_B';
const obras=[{id:1,nome:obra,status:'Em andamento',responsaveis:[nome],cidade:'Manaus',cliente:'Empresa'},{id:2,nome:'Obra B',status:'Em andamento',responsaveis:[]}];
const disponibilidade=[{id:1,tipo:'Ferramentas',modelo:'Escada',catalogoChave:'ferramentas|escada|',serie:'ERA-LOCAL',obraId:2,status:'Em campo',quantidadeDisponivel:6,controleQuantidade:'LOTE'}];
const decisao={tipo:'APROVACAO_INICIAL',autorNome:'Maria Gerente',autorLogin:'maria',registradoEm:'2026-10-22T08:00:00-04:00'};
const material=(q=10,c=0,a=0)=>({nome:'Escada',catalogoChave:'ferramentas|escada|',quantidadeSolicitada:q,quantidadeCompra:c,quantidadeAdquirida:a});
const analise=(id,status='Aguardando financeiro')=>({id,tipo:'Movimentação',tecnico:nome,solicitante:'Maria Gerente',solicitanteLogin:'maria',obraDestinoId:1,status,dataSolicitacao:'2026-10-22',materiais:[{id:id*10,nome:'Escada',catalogoChave:'ferramentas|escada|',quantidade:10,quantidadeCompra:0,quantidadeAdquirida:0,quantidadeEntradaEstoque:0}],eventosFinanceiros:[decisao],planoFinanceiro:[]});
function fixtures(){return [
  {id:12,status:'Aguardando financeiro',materiais:[material()],analises:[analise(12)]},
  {id:13,status:'Aprovada',materiais:[material(10,4,2)],analises:[analise(13,'Aprovada')]},
  {id:14,status:'Aprovada',materiais:[material(10,4,4)],analises:[],dataSolicitacao:'2021-01-05'},
  {id:15,status:'Rejeitada',materiais:[material()],analises:[],decisoes:[decisao,{...decisao,tipo:'REJEICAO',autorLogin:'financeiro'}]},
  {id:16,status:'Aprovada',obraDestinoId:2,obra:'Obra B',materiais:[material()],analises:[]},
  {id:17,status:'Aprovada',materiais:[material()],analises:[analise(117)]},
].map(p=>({tecnico:nome,solicitante:'Maria Gerente',solicitanteLogin:'maria',solicitantePerfil:'GERENTE',obraDestinoId:1,obra,dataSolicitacao:'2026-10-22',decisoes:[decisao],...p}));}
let pedidos=fixtures();const chamadas=[],mutacoes=[],proibidas=[];
const pagina=preview=>`<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
import React from 'react';import{createRoot}from'react-dom/client';import{ProvedorAutenticacao,useAutenticacao}from'/src/contexto/ContextoAutenticacao.jsx';import{PainelControleAtivos}from'/src/components/painel/PainelControleAtivos.jsx';import'/src/index.css';
localStorage.setItem('era-tema-gerente','claro');localStorage.setItem('era-atividades-visualizacao','kanban');window.impressoes=[];window.erros=[];window.addEventListener('error',e=>window.erros.push(e.message));window.open=()=>({document:{images:[],write:html=>window.impressoes.push(html),close(){}},focus(){},print(){}});
function Pagina(){const{usuario}=useAutenticacao();return usuario?React.createElement(PainelControleAtivos,${preview?"{perfilVisualizado:'FINANCEIRO'}":"{}"}):null;}createRoot(document.getElementById('root')).render(React.createElement(ProvedorAutenticacao,null,React.createElement(Pagina)));
</script></body></html>`;
const servidor=await createServer({cacheDir:'node_modules/.cache/vite-financeiro',server:{host:'127.0.0.1',port:0},plugins:[{name:'financeiro-fixtures',configureServer(s){s.middlewares.use(async(req,res,next)=>{
  if(req.url.startsWith('/__financeiro')){pedidos=fixtures();res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml(req.url,pagina(req.url.includes('preview'))));return;}
  if(!req.url.startsWith('/api/'))return next();const rota=req.url.split('?')[0].slice(4);chamadas.push(rota);let dados;
  if(rota==='/auth/me')dados={id:1,nome:'Financeiro',login:'financeiro',perfil:req.headers.referer?.includes('gerencia')?'GERENTE':req.headers.referer?.includes('preview')?'ADMIN':'FINANCEIRO',deveAlterarSenha:false};
  else if(rota==='/auth/csrf')dados={token:'teste'};
  else if(rota==='/obras')dados=obras;
  else if(rota==='/funcionarios')dados=[{id:1,nome,cargo:'Técnica',status:'Ativo'}];
  else if(rota==='/equipamentos/disponibilidade-financeira')dados=disponibilidade;
  else if(rota==='/atividades/pedidos-financeiros')dados=pedidos;
  else if(rota==='/notificacoes')dados={itens:[],naoLidas:0};
  else if(req.headers.referer?.includes('gerencia')&&rota==='/equipamentos')dados=disponibilidade.map(e=>({...e,quantidade:6,quantidadeReservada:0,historico:[],tecnico:nome}));
  else if(req.headers.referer?.includes('gerencia')&&rota==='/categorias-equipamento')dados=[{id:1,nome:'Ferramentas',campos:[]}];
  else if(req.headers.referer?.includes('gerencia')&&rota==='/atividades')dados=[{...analise(901,'Pendente')},{...analise(902,'Concluída')}];
  else if(req.method!=='GET'&&/^\/atividades\/\d+/.test(rota)){
    const partes=[];for await(const p of req)partes.push(p);const corpo=partes.length?JSON.parse(Buffer.concat(partes).toString()):{};
    const id=Number(rota.split('/')[2]),p=pedidos.find(p=>p.analises.some(a=>a.id===id));assert.ok(p,'Operação usa o ID da análise existente');const a=p.analises.find(a=>a.id===id);mutacoes.push({rota,corpo});
    if(rota.endsWith('/plano-financeiro')){a.planoFinanceiro=corpo.materiais;p.materiais[0].quantidadeCompra=corpo.materiais[0].quantidadeCompra;}
    else if(rota.endsWith('/aprovacao')){a.status='Aprovada';p.status='Aprovada';p.decisoes.push({...decisao,tipo:'APROVACAO',autorLogin:'financeiro'});}
    else if(req.method==='PATCH')a.observacao=corpo.observacao;
    dados=a;
  }else {proibidas.push(rota);res.statusCode=403;dados={mensagem:'Endpoint fora do escopo financeiro'};}
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(dados));
});}}]});
await servidor.listen();const base='http://127.0.0.1:'+servidor.httpServer.address().port;
const navegador=await iniciarNavegador();const {abrir,esperar,tocar,avaliar,preencher,botao,cdp}=navegador;
const q=seletor=>`document.querySelector(${JSON.stringify(seletor)})`;
const visivel=texto=>`Array.from(document.querySelectorAll('button')).find(b=>(b.textContent.trim().startsWith(${JSON.stringify(texto)})||b.querySelector('small')?.textContent===${JSON.stringify(texto)})&&b.getBoundingClientRect().width&&b.getBoundingClientRect().height)`;
const cards=`document.querySelectorAll(${JSON.stringify('button[aria-label^="Abrir solicitação"]')}).length`;
const busca=q('input[aria-label^="Pesquisar em"]');
const noModal=texto=>`Array.from(document.querySelectorAll('[role=dialog] button')).find(b=>b.textContent.trim().startsWith(${JSON.stringify(texto)}))`;
const fechar=async()=>{await tocar(q('[aria-label="Fechar solicitação"]'));await esperar('!document.querySelector("[role=dialog]")');};
async function inspecionar(nome){
  assert.ok(await avaliar('document.documentElement.scrollWidth<=innerWidth+2'),'Sem overflow da página: '+nome);
  assert.deepEqual(await avaliar('window.erros'),[],'Sem erros React: '+nome);
  const dir=path.resolve('node_modules/.cache/financeiro');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,nome+'.png'),Buffer.from((await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
}
try {
  for(const largura of [320,390,768,1440]){
    await abrir(base+'/__financeiro',largura,900);await esperar(cards+'===6');
    assert.equal(await avaliar('document.querySelectorAll("aside nav button").length>0'),true);
    assert.equal(await avaliar('Array.from(document.querySelectorAll("nav button")).some(b=>b.textContent.trim().startsWith("Equipamentos"))'),false);
    assert.equal(await avaliar(`document.querySelectorAll(${JSON.stringify('[aria-label="Kanban de solicitações"]>section')}).length`),5);
    await inspecionar('kanban-'+largura);
    for(const termo of ['#0012','maria','Escada','2021-01-05']){
      await preencher(busca,termo);await esperar(cards+'==='+(['#0012','2021-01-05'].includes(termo)?1:6));
    }
    await preencher(busca,'#0012');await esperar(cards+'===1');await tocar(botao('PDF dos pedidos'));
    let pdf=await avaliar('window.impressoes.at(-1)');assert.match(pdf,/#0012/);assert.doesNotMatch(pdf,/#0013|Romaneio|Retirada|Recebimento confirmado/);
    await preencher(busca,'');await esperar(cards+'===6');
    await avaliar(`(()=>{const e=${q('select[aria-label="Filtrar solicitações por obra"]')};e.value='2';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await esperar(cards+'===1');
    await tocar(botao('Limpar filtros'));await esperar(cards+'===6');
    await preencher(q('input[aria-label="Data inicial do pedido"]'),'2021-01-01');await preencher(q('input[aria-label="Data final do pedido"]'),'2021-12-31');await esperar(cards+'===1');
    await tocar(botao('PDF dos pedidos'));assert.match(await avaliar('window.impressoes.at(-1)'),/#0014/);
    await tocar(botao('Limpar filtros'));await esperar(cards+'===6');
    await tocar(q('button[aria-label^="Abrir solicitação 12,"]'));await esperar(q('[aria-label="Dados do pedido financeiro"]'));await inspecionar('pedido-'+largura);
    assert.equal(await avaliar('document.querySelector("[role=dialog]").textContent.includes("Materiais do pedido")'),true);
    await tocar(noModal('PDF do pedido'));await fechar();
    await tocar(botao('Por técnico'));await esperar(q('button[aria-controls="pedidos-tecnico-0"]'));await tocar(q('button[aria-controls="pedidos-tecnico-0"]'));await esperar(cards+'===6');await inspecionar('por-tecnico-'+largura);
    for(const [aba,esperado] of [['Obras','Pedidos da obra'],['Funcionários','Pedidos do técnico'],['Depósito','0 solicitações']]){
      await tocar(visivel(aba==='Funcionários'&&largura<=768?'Equipe':aba));await esperar('document.querySelector("main").textContent.includes('+JSON.stringify(esperado)+')');await inspecionar(aba.normalize('NFD').replace(/[\u0300-\u036f]/g,'')+'-'+largura);
      if(aba!=='Depósito'){await tocar(botao(aba==='Obras'?'Pedidos da obra':'PDF dos pedidos'));pdf=await avaliar('window.impressoes.at(-1)');assert.match(pdf,/#0012/);assert.doesNotMatch(pdf,/ERA-LOCAL|Romaneio|Recebimento confirmado/);}
    }
    await tocar(visivel('Atividades'));await tocar(botao('Kanban'));await esperar(cards+'===6');
    if(largura===390||largura===1440){
      await tocar(q('button[aria-label^="Abrir solicitação 12,"]'));await tocar(noModal('Definir transporte e compra'));await esperar(q('[aria-labelledby="titulo-separacao"]'));
      assert.ok(await avaliar('document.querySelector("[role=dialog]").textContent.includes("Obra B")'),'Planejamento ainda mostra a localização atual');
      await tocar(botao('Comprar tudo e manter nas origens'));await preencher(q('[role=dialog] textarea'),'Preservar o equipamento em uso na obra.');await inspecionar('plano-'+largura);
      await tocar(botao('Salvar plano financeiro'));await esperar(q('[aria-label="Dados do pedido financeiro"]'));await tocar(noModal('Aprovar plano'));await esperar('!document.querySelector("[role=dialog]")');
      const salvo=mutacoes.filter(m=>m.rota==='/atividades/12/plano-financeiro').at(-1);assert.equal(salvo.corpo.materiais[0].quantidadeCompra,10);assert.deepEqual(salvo.corpo.materiais[0].origens,[]);
      await tocar(q('button[aria-label^="Abrir solicitação 17,"]'));await tocar(noModal('Editar'));await esperar(q('[aria-label="Editar solicitação"]'));assert.equal(await avaliar(q('[aria-label="Editar solicitação"]')+'.textContent.includes("Obra de origem")'),false);
      await preencher(q('[role=dialog] textarea'),'Observação revista do saldo pendente.');await tocar(botao('Salvar alterações'));await esperar('!document.querySelector("[role=dialog]")');
      assert.ok(mutacoes.some(m=>m.rota==='/atividades/117'&&m.corpo.observacao==='Observação revista do saldo pendente.'));
      assert.equal(await avaliar(cards),6,'A edição do saldo não duplica o pedido');
      await tocar(q('[aria-label="Ativar tema escuro"]'));await inspecionar('escuro-'+largura);
    }
  }
  await abrir(base+'/__financeiro?preview',1440);await esperar(cards+'===6');await inspecionar('admin-preview');
  assert.deepEqual(proibidas,[],'Não carrega inventário, vistorias nem histórico físico');
  assert.ok(chamadas.includes('/atividades/pedidos-financeiros'));
  for(const largura of [390,1440]){
    await abrir(base+'/__financeiro?gerencia',largura);await esperar(q('[aria-label="Visualização dos equipamentos"]'));
    assert.equal(await avaliar('Array.from(document.querySelectorAll("nav button")).some(b=>b.textContent.trim().startsWith("Equipamentos"))'),true,'Gerência mantém os equipamentos');
    await tocar(visivel('Atividades'));await esperar(q('[aria-label="Kanban de solicitações"]'));
    assert.equal(await avaliar(`document.querySelectorAll(${JSON.stringify('[aria-label="Kanban de solicitações"]>section')}).length`),6,'Gerência mantém todas as etapas físicas');
    await tocar(q('button[aria-label^="Abrir solicitação 901,"]'));await esperar(q('[aria-label="Detalhes da solicitação"]')+'||document.querySelector("[role=dialog]")');
    assert.equal(await avaliar(q('[aria-label="Dados do pedido financeiro"]')+'===null'),true);await inspecionar('gerencia-'+largura);
  }
  console.log('Financeiro: pesquisa histórica, filtros, PDFs, menus, planejamento e responsividade 320/390/768/1440 px: OK');
} finally {navegador.fechar();await servidor.close();}
