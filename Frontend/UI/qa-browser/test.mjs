import { test as base,expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

export { expect };
export const test=base.extend({
  cobertura: [async ({page,context},use,testInfo)=>{
    await context.route('**/*',route=>{
      const url=new URL(route.request().url());
      return ['http:','https:'].includes(url.protocol)&&url.origin!=='http://127.0.0.1:4179'?route.abort('blockedbyclient'):route.continue();
    });
    await page.route('http://127.0.0.1:4179/api/**',route=>route.fulfill({status:503,json:{mensagem:'Rota não simulada no teste.'}}));
    // sessionStorage preserva sincronamente os contadores ao navegar/recarregar.
    // Cada teste tem um contexto novo: nenhuma amostra é herdada de outro teste.
    await context.addInitScript(()=>{
      window.addEventListener('pagehide',()=>{
        if(!window.__coverage__)return;
        const amostras=JSON.parse(sessionStorage.getItem('__qaCobertura')||'[]');
        amostras.push(window.__coverage__);sessionStorage.setItem('__qaCobertura',JSON.stringify(amostras));
      });
    });
    await use();
    const amostras=await page.evaluate(()=>[
      ...JSON.parse(sessionStorage.getItem('__qaCobertura')||'[]'),
      ...(window.__coverage__?[window.__coverage__]:[]),
    ]);
    expect(amostras.length,'A página precisa fornecer contadores de cobertura.').toBeGreaterThan(0);
    const arquivo=testInfo.outputPath('coverage.json');await writeFile(arquivo,JSON.stringify(amostras));
    await testInfo.attach('cobertura-ui',{path:arquivo,contentType:'application/json'});
  },{auto:true}],
});
