$ErrorActionPreference = 'Stop'
$raizProjeto = Split-Path -Parent $PSScriptRoot
$configuracaoTeste = Join-Path $raizProjeto 'Backend/API/target/fluxo-requisicoes-config.json'
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $configuracaoTeste) | Out-Null

# O banco habitual e usado somente como servidor: os testes tem banco e API proprios.
$bancoDesenvolvimento = (docker inspect era-erp-dev-database-1 | ConvertFrom-Json)[0]
if ($LASTEXITCODE -ne 0) { throw 'O PostgreSQL de desenvolvimento precisa estar em execucao.' }
$variaveisBanco = @{}
foreach ($linha in $bancoDesenvolvimento.Config.Env) {
    $partes = $linha.Split('=', 2)
    $variaveisBanco[$partes[0]] = $partes[1]
}
$instanteTeste = [DateTime]::UtcNow.ToString('yyyyMMddHHmmss')
$nomeBancoTeste = "era_auditoria_smoke_$instanteTeste"
$nomeContainerTeste = "era-auditoria-smoke-$instanteTeste"
$bancoCriado = $false
$containerCriado = $false
try {
    docker exec era-erp-dev-database-1 createdb -U $variaveisBanco['POSTGRES_USER'] $nomeBancoTeste
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel criar o banco temporario.' }
    $bancoCriado = $true
    docker run -d --name $nomeContainerTeste --label era.test=auditoria --network era-erp-dev_era_network -p '127.0.0.1::8080' `
        -e "DB_URL=jdbc:postgresql://database:5432/$nomeBancoTeste" `
        -e "DB_USERNAME=$($variaveisBanco['POSTGRES_USER'])" -e "DB_PASSWORD=$($variaveisBanco['POSTGRES_PASSWORD'])" `
        -e ADMIN_INITIAL_NAME='Auditoria Smoke' -e ADMIN_INITIAL_LOGIN=audit-smoke-admin `
        -e 'ADMIN_INITIAL_PASSWORD=TempCheck#578943' -e TZ=America/Manaus era-erp-dev-api | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel iniciar a API temporaria.' }
    $containerCriado = $true
    $portaTeste = (docker port $nomeContainerTeste 8080/tcp).Trim()
    @{ url = "http://$portaTeste"; container = $nomeContainerTeste; database = $nomeBancoTeste } |
        ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath $configuracaoTeste
    node (Join-Path $PSScriptRoot 'validar-fluxo-requisicoes.mjs') $configuracaoTeste
    if ($LASTEXITCODE -ne 0) { throw 'A validacao integrada encontrou uma falha.' }
}
finally {
    # Validar rigorosamente os alvos antes de remover somente os recursos deste teste.
    if ($nomeContainerTeste -notmatch '^era-auditoria-smoke-\d{14}$' -or $nomeBancoTeste -ne "era_auditoria_smoke_$instanteTeste") {
        throw 'Identificacao dos recursos temporarios invalida; limpeza interrompida.'
    }
    if ($containerCriado) {
        $containerTeste = (docker inspect $nomeContainerTeste | ConvertFrom-Json)[0]
        if ($containerTeste.Config.Labels.'era.test' -ne 'auditoria') { throw 'O container nao pertence aos testes.' }
        docker rm -f $nomeContainerTeste | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel remover a API temporaria.' }
    }
    if ($bancoCriado) {
        docker exec era-erp-dev-database-1 dropdb --force -U $variaveisBanco['POSTGRES_USER'] $nomeBancoTeste
        if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel remover o banco temporario.' }
    }
}
