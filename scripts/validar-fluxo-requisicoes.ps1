$ErrorActionPreference = 'Continue'
# Os contratos antigos foram substituídos pela regressão do fluxo financeiro atual.
node (Join-Path $PSScriptRoot 'testar-integracao.mjs') --sem-navegador
$codigoTeste = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($codigoTeste -ne 0) { throw 'A regressao isolada dos fluxos falhou.' }
