import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export async function iniciarNavegador() {
  const perfil=fs.mkdtempSync(path.join(os.tmpdir(),'era-estoque-'));
  const chrome=spawn(process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--no-first-run','--disable-gpu','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+perfil,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
  let ws,numero=0,sessionId,targetId;const pendentes=new Map();
  try {
    const endpoint=await new Promise((resolve,reject)=>{let saida='';const timer=setTimeout(()=>reject(Error('Chrome não iniciou')),15000);chrome.stderr.on('data',b=>{saida+=b;const m=saida.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(timer);resolve(m[1]);}});chrome.on('error',reject);});
    ws=new WebSocket(endpoint);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
    ws.addEventListener('message',({data})=>{const m=JSON.parse(data),p=pendentes.get(m.id);if(!p)return;clearTimeout(p.timer);pendentes.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);});
    const enviar=(method,params={},session)=>new Promise((resolve,reject)=>{const id=++numero,timer=setTimeout(()=>{pendentes.delete(id);reject(Error('Chrome sem resposta: '+method));},20000);pendentes.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params,sessionId:session}));});
    const cdp=(method,params)=>enviar(method,params,sessionId);
    const avaliar=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
    const esperar=async expression=>{for(let i=0;i<160;i++){if(await avaliar(`Boolean(${expression})`))return;await new Promise(r=>setTimeout(r,70));}throw Error('Tempo esgotado: '+expression);};
    const tocar=async expression=>{const ponto=await avaliar(`(()=>{const e=${expression};if(!e||e.disabled)return null;e.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return{x,y,alcancavel:e.contains(document.elementFromPoint(x,y))};})()`);assert.ok(ponto?.alcancavel,'Botão alcançável: '+expression);await cdp('Input.dispatchMouseEvent',{type:'mousePressed',x:ponto.x,y:ponto.y,button:'left',clickCount:1});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:ponto.x,y:ponto.y,button:'left',clickCount:1});await new Promise(r=>setTimeout(r,80));};
    const preencher=(expression,valor)=>avaliar(`(()=>{const e=${expression};Object.getOwnPropertyDescriptor(e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(String(valor))});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    const botao=texto=>`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim().startsWith(${JSON.stringify(texto)}))`;
    const abrir=async(url,width,height=900)=>{if(targetId)await enviar('Target.closeTarget',{targetId});({targetId}=await enviar('Target.createTarget',{url:'about:blank'}));({sessionId}=await enviar('Target.attachToTarget',{targetId,flatten:true}));await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await cdp('Page.navigate',{url});};
    return {cdp,avaliar,esperar,tocar,preencher,botao,abrir,fechar:()=>{for(const p of pendentes.values())clearTimeout(p.timer);ws?.close();chrome.kill();}};
  } catch(e) {ws?.close();chrome.kill();throw e;}
}
