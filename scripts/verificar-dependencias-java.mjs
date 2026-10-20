// Executar depois de mvnw dependency:tree -DoutputType=json -DoutputFile=target/security-dependencies.json -Dscope=runtime.
// Somente nomes e versões públicos das bibliotecas são enviados à OSV.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const arquivo = process.argv[2] || 'Backend/API/target/security-dependencies.json';
const arvore = JSON.parse(fs.readFileSync(arquivo, 'utf8').replace(/^\uFEFF/, ''));
const dependencias = new Map();
function visitar(item) {
  const nome = `${item.groupId}:${item.artifactId}`;
  assert.ok(item.groupId && item.artifactId && item.version, 'Dependência sem identificação completa.');
  dependencias.set(`${nome}@${item.version}`, { package: { ecosystem: 'Maven', name: nome }, version: item.version });
  for (const filho of item.children || []) visitar(filho);
}
for (const filho of arvore.children || []) visitar(filho);
assert.ok(dependencias.size > 0, 'A árvore de dependências está vazia.');
const consultas = [...dependencias.values()];
const alertas = [];
for (let inicio = 0; inicio < consultas.length; inicio += 100) {
  const lote = consultas.slice(inicio, inicio + 100);
  const resposta = await fetch('https://api.osv.dev/v1/querybatch', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queries: lote }), signal: AbortSignal.timeout(30000),
  });
  assert.ok(resposta.ok, `A consulta OSV falhou: HTTP ${resposta.status}.`);
  const dados = await resposta.json();
  assert.equal(dados.results?.length, lote.length, 'A OSV retornou uma análise incompleta.');
  dados.results.forEach((resultado, indice) => {
    for (const vulnerabilidade of resultado.vulns || []) alertas.push({
      biblioteca: lote[indice].package.name, versao: lote[indice].version,
      alerta: vulnerabilidade.id, referencia: `https://osv.dev/vulnerability/${vulnerabilidade.id}`,
    });
  });
}
console.log(JSON.stringify({ bibliotecasConsultadas: consultas.length, alertas }, null, 2));
if (alertas.length) process.exitCode = 1;
