import path from 'node:path';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import cobertura from 'istanbul-lib-coverage';
import relatorio from 'istanbul-lib-report';
import formatos from 'istanbul-reports';
import { coberturaInicial,pastaCobertura,raizUi } from './cobertura.mjs';

export default class CoberturaReporter {
  locais(dados){return JSON.stringify([dados.statementMap,dados.fnMap,dados.branchMap]);}
  onBegin(_config,suite) {
    this.mapa=cobertura.createCoverageMap(coberturaInicial());this.carregados=new Set();this.erros=[];this.coletados=0;this.esperados=suite.allTests().length;
    this.originais=Object.fromEntries(this.mapa.files().map(f=>[f,this.locais(this.mapa.fileCoverageFor(f).data)]));
  }
  onTestEnd(test,result) {
    try {
      const anexo=result.attachments.find(a=>a.name==='cobertura-ui');
      if(!anexo?.path)throw Error('Anexo de cobertura ausente.');
      const amostras=JSON.parse(readFileSync(anexo.path,'utf8'));
      for(const amostra of amostras){
        for(const arquivo of Object.keys(amostra)){
          if(!this.mapa.files().includes(arquivo))throw Error(`Fonte fora do inventário: ${arquivo}`);
          if(this.locais(amostra[arquivo])!==this.originais[arquivo])throw Error(`Localizações diferentes do fonte original: ${arquivo}`);
          this.carregados.add(arquivo);
        }
        this.mapa.merge(amostra);
      }
      this.coletados++;
    } catch(e){this.erros.push({teste:test.title,erro:e.message});}
  }
  onEnd(result) {
    mkdirSync(pastaCobertura,{recursive:true});
    const contexto=relatorio.createContext({dir:pastaCobertura,coverageMap:this.mapa});
    for(const formato of ['html','lcovonly','json','json-summary'])formatos.create(formato).execute(contexto);
    const arquivos=this.mapa.files().map(f=>({arquivo:path.relative(raizUi,f),carregado:this.carregados.has(f),...this.mapa.fileCoverageFor(f).toSummary().data}));
    const grupo=filtro=>{
      const mapa=cobertura.createCoverageMap({});
      for(const f of this.mapa.files().filter(filtro))mapa.addFileCoverage(this.mapa.fileCoverageFor(f));
      return {arquivos:mapa.files().length,...mapa.getCoverageSummary().data};
    };
    const completa=result.status==='passed'&&!this.erros.length&&this.coletados===this.esperados;
    const resumo={coletadoEm:new Date().toISOString(),escopo:'Todos os .js/.jsx em src; instrumentação antes do React/JSX no Vite exclusivo de testes. Fontes não carregadas permanecem com zero. API simulada; Chromium desktop/mobile.',execucaoCompleta:completa,casosEsperados:this.esperados,casosColetados:this.coletados,erros:this.erros,
      total:{arquivos:arquivos.length,...this.mapa.getCoverageSummary().data},jsx:grupo(f=>f.endsWith('.jsx')),hooks:grupo(f=>/^use[^/]*\.js$/.test(path.basename(f))),arquivosNaoCarregados:arquivos.filter(f=>!f.carregado).map(f=>f.arquivo),arquivos};
    writeFileSync(path.join(pastaCobertura,'resumo.json'),JSON.stringify(resumo,null,2)+'\n');
    console.log(`[Cobertura UI] ${resumo.jsx.arquivos} JSX, ${resumo.hooks.arquivos} hooks; linhas globais ${resumo.total.lines.pct}%; coleta ${this.coletados}/${this.esperados}.`);
    if(!completa){console.error('[Cobertura UI] Coleta incompleta ou suíte reprovada.',this.erros);return {status:'failed'};}
  }
}
