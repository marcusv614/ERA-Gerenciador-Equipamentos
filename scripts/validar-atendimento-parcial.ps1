$ErrorActionPreference = 'Continue'
# Compatibilidade com o comando antigo; não acessa o PostgreSQL habitual.
node (Join-Path $PSScriptRoot 'testar-integracao.mjs') --suite=atendimento-parcial --sem-navegador
$codigoTeste = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($codigoTeste -ne 0) { throw 'A validacao isolada de atendimento parcial falhou.' }
