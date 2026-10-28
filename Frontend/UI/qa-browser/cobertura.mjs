import path from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import instrumentacao from 'istanbul-lib-instrument';

export const raizUi=fileURLToPath(new URL('..',import.meta.url));
export const raizSrc=path.join(raizUi,'src');
export const pastaCobertura=fileURLToPath(new URL('../../../test-results/quality-assurance/browser-local/coverage',import.meta.url));
export function fontes(diretorio=raizSrc) {
  return readdirSync(diretorio,{withFileTypes:true}).flatMap(e=>e.isDirectory()?fontes(path.join(diretorio,e.name)):/\.(js|jsx)$/.test(e.name)?[path.join(diretorio,e.name)]:[]).sort();
}
export function instrumentar(codigo,arquivo) {
  const instrumento=instrumentacao.createInstrumenter({esModules:true,parserPlugins:['jsx'],produceSourceMap:true,compact:false});
  const code=instrumento.instrumentSync(codigo,arquivo);
  return {code,map:instrumento.lastSourceMap(),cobertura:instrumento.lastFileCoverage()};
}
export function coberturaInicial() {
  return Object.fromEntries(fontes().map(arquivo=>[arquivo,instrumentar(readFileSync(arquivo,'utf8'),arquivo).cobertura]));
}
export function coberturaVite() {
  return {name:'qa-cobertura-src',enforce:'pre',apply:'serve',transform(codigo,id){
    const arquivo=id.split('?')[0];
    if(!arquivo.startsWith(raizSrc+path.sep)||!/\.(js|jsx)$/.test(arquivo))return null;
    const {code,map}=instrumentar(codigo,arquivo);return {code,map};
  }};
}
