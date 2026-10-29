# Carga e restauração antes do piloto — atualização em 29/10/2026

Continuação do fechamento do piloto, com Docker novamente disponível.
O usuário informou domínio `tools.eraltda.com.br`, HTTPS pela Hostinger,
aproximadamente 20 pessoas e pelo menos três obras em andamento. O volume de
registros é alto, sem contagem real informada; os responsáveis continuam a definir.
O destino de backup escolhido é a pasta Documentos deste computador.

## Ensaio de restauração

O teste `QA-BKP-01` criou um dump custom do PostgreSQL 16, alterou uma obra,
restaurou o banco e conferiu o conteúdo de **24 tabelas e 20 sequências**,
incluindo os valores e `is_called`. A retomada com novo login e leituras de
obras, equipamentos, funcionários e pedidos foi aprovada.

Duas correções foram necessárias na automação, sem alteração da aplicação:

- Consultar novamente a porta publicada da API após reinício. O Docker mudou
  a porta efêmera do mesmo contêiner; o teste tentava consultar a porta antiga.
- Comparar responsáveis de obra como conjunto. O domínio usa `Set`, sem ordem
  persistida; os nomes retornaram em outra ordem após restauração. A comparação
  de todas as tabelas já confirmava conteúdo idêntico. Os demais campos e as
  listas cujo conteúdo/ordem são relevantes continuam sendo conferidos.

A tentativa com porta antiga e a tentativa com ordenação incorreta permaneceram
nos artefatos. Não foram contadas como defeitos novos da aplicação. O primeiro
ensaio aprovado está em `test-results/integracao-1793149187848`.

Uma cópia do dump aprovado foi salva em:
`/home/marcus/Documents/Backups-ERA/ensaios/ENSAIO-FICTICIO-ERA-dc58d5d153fba59b.dump`.
O arquivo tem 104.259 bytes e hash SHA-256
`dc58d5d153fba59b137c7ba7e8fc8e370529b1caa9f32a1e5f280e1f72400e52`,
conferido após a cópia. O manifesto ao lado do arquivo identifica os dados como
fictícios. Permissões restritas e criação sem sobrescrever outro backup.

**Essa cópia não contém dados reais da VPS.** O destino está definido; a cópia
real, a periodicidade, a retenção e a atribuição do responsável ainda precisam
ser configuradas antes do início operacional. O ensaio restaura a mesma versão,
sem validar downgrade ou base legada representativa.

## Protocolo de carga

`QA-CARGA-01` usa stack própria com limites de CPU/memória e dados fictícios.
Acrescenta **5.000 equipamentos e 2.000 pedidos**, distribuídos por três obras.
Cada pedido tem um material; os novos equipamentos não acrescentam histórico de
movimentações. As contas sintéticas são 20 usuários distintos de Gerência, com
acesso às três obras. Isso evita a revogação causada por logins da mesma conta
em sessões diferentes; a distribuição real de perfis ainda não foi informada.

Após aquecimento separado, cada sessão faz cinco leituras consecutivas, sem
pausa entre elas: equipamentos, pedidos, obras, equipamentos e pedidos.
São **100 leituras previstas**, com até 20 requisições em andamento. O limite de
10 segundos por resposta corresponde ao timeout padrão da interface. Falhas
encerram a sequência daquela sessão e são registradas, sem retries automáticos.
O ensaio só aprova quando conclui as 100 leituras sem falhas e o aquecimento
respeita o mesmo limite. Medições incluem recebimento e leitura do corpo HTTP.

O teste mede leituras locais, sem renderizar 20 navegadores, sem simular todo o
fluxo de gravações e sem comprovar SLA da Hostinger. O volume é uma hipótese de
ensaio explícita, não uma contagem real do acervo. Outros limites operacionais
precisam ser reavaliados com a base e os recursos efetivos do servidor.

## Gargalo encontrado e correção em validação

Antes da correção, a consulta isolada dos equipamentos excedeu 10 segundos.
As 20 leituras simultâneas da primeira onda expiraram; as seguintes não foram
executadas. A consulta buscava o histórico individualmente para cada equipamento,
além de carregar associações ORM por consultas repetidas.

A correção agrupa os históricos em uma busca por IDs, preservando a ordem dos
eventos de cada equipamento. Mantém os filtros por perfil e obra e o mascaramento
de locais restritos. As associações usam carregamento em lote; manutenção e
calibração da listagem usam subconsulta para evitar percorrer pequenos lotes
separados. As consultas continuam refletindo os saldos atuais.

Um teste Java verifica o agrupamento por equipamento, a ordem dos eventos e a
consulta única de históricos. A fixture dos testes existentes de privacidade
foi adaptada à consulta em lote, preservando suas assertivas de isolamento.
A primeira regressão Java passou com **787 testes**; nova validação completa
acompanha o candidato final.

No perfil de **2 CPUs / 1 GiB**, a primeira otimização reduziu a leitura isolada
para cerca de 2,5 segundos, mas as 20 requisições simultâneas ainda expiraram.
O log de GC evidenciou pressão no heap, chegando perto de 247 MiB, com coletas
completas frequentes. Esse perfil permanece reprovado para o cenário ensaiado.
A segunda otimização não resolveu a carga nesse mesmo limite de memória.

Foi iniciado outro ensaio com **2 CPUs / 2 GiB**, preservando usuários, registros,
prazo por resposta e demais recursos. O resultado desse perfil deve ser separado
do resultado de 1 GiB. Não se presume que esses recursos estejam contratados na
Hostinger. Os valores efetivos são lidos da configuração dos contêineres.

A correção e o dimensionamento ainda dependem da conclusão da carga e da
regressão completa com a mesma imagem identificada pela varredura de segurança.
Nenhuma falha de preparação da massa foi contada como defeito da aplicação:
as primeiras fixtures foram corrigidas para respeitar autoria, tipo persistido,
chave de catálogo e fuso, sem remover restrições do banco.

## Resultado da retomada — 29/10/2026

O perfil de **2 CPUs / 2 GiB também foi REPROVADO**. A leitura isolada de
equipamentos levou 2.993 ms, e a de pedidos, 1.316 ms. Na primeira onda
concorrente, as **20 leituras de equipamentos expiraram**, entre 10.008 e
10.019 ms. Foram 20 tentativas e zero sucessos; as outras 80 leituras previstas
não chegaram a ser feitas. Portanto não há p95 de leituras bem-sucedidas nem
vazão aprovada. O resultado não foi substituído por um cenário menor.

A imagem medida foi
`sha256:5f6bc6ef6e1ab1d196adc447b205af4f2e8aac6df784f1e75dc8c5d9e9d6858e`,
com artefatos em `test-results/integracao-1793154831359` e cópia do resultado
em `test-results/quality-assurance/piloto/carga-2g.json`.

O problema foi registrado como **QA-BUG-011, MÉDIA, ABERTO**: a otimização
reduziu a latência isolada, mas não comprovou capacidade para a carga proposta.
Os dez defeitos anteriores continuam com suas evidências históricas; esse novo
problema não foi contado como corrigido.

A regressão Java atual passou com **787 testes, zero falhas, erros ou ignorados**,
em `java-15.log`. Maven, npm audit e OSV foram reexecutados; nenhum alerta nas
dependências consultadas. Os 278 casos de interface continuam sendo evidência
anterior, preservada pelos hashes dos mesmos 102 fontes; não foram reexecutados.

A tentativa atual de integração completa parou antes da criação das stacks:
o socket Docker não está disponível nesta sessão. A inicialização autorizada
exigiu autenticação administrativa local, que não foi solicitada pelo chat.
A integração, os E2E atuais e a varredura das imagens permanecem bloqueados até
o Docker voltar. O ensaio de restauração aprovado anteriormente continua
registrado separadamente, sem apresentá-lo como uma nova integração aprovada.

O início do piloto permanece adiado. A carga reprovada precisa ser resolvida,
além da validação final das imagens e da integração. No destino real, continuam
a definição dos responsáveis, recursos efetivos da VPS, backup dos dados reais
com periodicidade/retenção, HTTPS/sessão e smoke de operação.

## Dimensionamento medido na continuação de 29/10

O Docker voltou a ficar disponível. Foi coletado um perfil JFR exclusivamente
na stack descartável, antes de novas alterações na aplicação. O recorte das
leituras evidencia custo de hidratação do Hibernate. O custo de Argon2 durante
criação de contas/login foi separado; não foi atribuído à listagem. O perfil
serve para diagnóstico, não para aprovação de capacidade.

Com **2 CPUs / 2 GiB e heap inicial/máximo de 1 GiB**, a leitura isolada de
equipamentos caiu para 1.074 ms e pedidos para 517 ms. A carga permaneceu
reprovada: 60 tentativas, 50 sucessos e dez timeouts. Não representa aprovação
de 100 leituras nem altera a reprovação dos perfis anteriores.

O perfil separado de **4 CPUs / 2 GiB, heap inicial/máximo de 1 GiB**, concluiu
**100 de 100 leituras**, zero erros, p95 de **5.181 ms** e máximo de **6.511 ms**.
O banco permaneceu com 1 CPU / 512 MiB; a UI, 0,5 CPU / 128 MiB. Usuários,
volume e prazo de 10 segundos permaneceram iguais. Resultado em
`test-results/integracao-1793277260859`. Essa aprovação local não demonstra
capacidade da VPS, nem transforma os ensaios com 2 CPUs em aprovados.

A configuração padrão de `compose.test.load.yaml` registra esse perfil;
`ERA_CARGA_CPUS_API`, `ERA_CARGA_MEMORIA_API` e `ERA_CARGA_JAVA_OPCOES` permitem
medir perfis explícitos. Toda mudança de recursos precisa ser identificada no
resultado. O teste registra limites reais do contêiner e opções da JVM.
`--perfil-carga`, somente com `--suite=carga-piloto`, coleta JFR e faz a cópia
após conferir os rótulos de todos os contêineres antes da limpeza.

Está em execução uma confirmação sem JFR com o perfil padrão reproduzível.
Depois serão executadas a integração completa e a varredura das imagens.
QA-BUG-011 só será encerrado no escopo desse perfil depois da regressão
aprovada. Os recursos efetivamente contratados na Hostinger foram solicitados
ao usuário e ainda não foram presumidos.

## Restrição da VPS compartilhada informada pelo usuário

A VPS tem **4 vCPUs, 16 GB de RAM e 200 GB de armazenamento**, e também executa
o Nextcloud da empresa. O usuário determinou que o ERP não pode usar todos os
recursos. Assim, o perfil que concedia 4 CPUs somente à API **não atende ao
orçamento de aceitação**, apesar das 100 leituras aprovadas localmente.

O novo perfil proposto limita a API a **2 CPUs / 4 GiB**, com heap inicial e
máximo de 2 GiB, PostgreSQL a **0,5 CPU / 512 MiB**, e UI a **0,25 CPU / 128 MiB**.
A soma dos tetos de CPU do ERP é 2,75 vCPUs; a soma dos limites de memória é
4,625 GiB. São limites de consumo no ensaio, não reservas de capacidade nem
garantia contra contenção com outros serviços. Não se alterou a VPS ou o
Nextcloud. O armazenamento de 200 GB não foi testado como capacidade disponível.

O critério P09 agora exige limites reais dos três serviços dentro desse
orçamento, além das mesmas 20 sessões, volume, 100 leituras sem erros, prazo de
10 segundos e imagem identificada pela varredura. O consumo real do Nextcloud
e o comportamento conjunto no destino continuam sem medição.

## Consulta de leitura e resultado dentro do orçamento compartilhado

Com o orçamento reduzido e heap de 2 GiB, a consulta anterior ainda apresentou
oito timeouts em 68 tentativas (as sequências interrompidas não chegaram às
100 leituras). Artefato: `test-results/integracao-1793277984343`.

A listagem completa passou a usar uma projeção JPQL com os campos públicos do
equipamento, sem registrar milhares de equipamentos no contexto de persistência.
Os `left join` preservam itens sem obra ou técnico. Manutenções e calibrações
são consultadas separadamente e agrupadas pelo ID do equipamento, preservando
a ordem por criação/ID decrescentes; evita-se o produto cartesiano das listas.
As regras de status/disponibilidade, o DTO e os filtros de perfil/obra continuam
no serviço existente. As instâncias dessa projeção são somente para leitura;
gravações continuam buscando a entidade com os mecanismos de bloqueio existentes.

Também foram pré-compiladas as expressões de remoção de acentos/espaços da chave
de catálogo. A normalização e seus resultados permanecem iguais; o `Matcher`
continua sendo criado por chamada, sem estado compartilhado entre requisições.
Não foi introduzido cache de respostas ou saldos.

O teste de contrato compara a resposta completa do equipamento com a da
projeção, incluindo campos, disponibilidade, manutenção e calibração. Os testes
de privacidade e agrupamento de históricos continuam ativos. O candidato final
passou com **788 testes Java**, zero falhas, erros ou ignorados.

No mesmo orçamento da VPS compartilhada, a carga final concluiu **100 de 100
leituras**, zero erros, p95 de **6.799 ms** e máximo de **7.473 ms**. API com
2 CPUs / 4 GiB, heap inicial/máximo de 2 GiB; banco com 0,5 CPU / 512 MiB; UI
com 0,25 CPU / 128 MiB. São os mesmos usuários, registros e prazo por resposta.
Artefato: `test-results/integracao-1793278657900`; imagem API:
`sha256:e348b95aa4f85a1f6adda6bbda6f937fbb1c2dd9d983d37981df30e68cfcb02a`.
A primeira versão da projeção também passou, com máximo de 9.377 ms; a pequena
margem motivou a melhoria adicional da normalização antes do candidato final.

Os limites foram preparados em `compose.production.yaml` e a renderização do
Compose foi validada com configuração fictícia e `.env` vazio explícito. Nenhum
serviço de produção foi iniciado. O teto total do ERP é 2,75 CPUs / 4,625 GiB.
A implantação futura deve usar as imagens aprovadas e conferir o consumo de
CPU, memória e I/O junto ao Nextcloud. O teste local isolado não comprova esse
comportamento conjunto ou o espaço efetivamente disponível no disco.

A regressão completa da imagem final e a varredura estão na sequência de
validação. O fechamento agora vincula a integração aos hashes dos fontes no
início e aos IDs das imagens; uma execução de candidato anterior não satisfaz
essa verificação. A coleta de métricas permite selecionar explicitamente a
integração completa (`--integracao=test-results/integracao-ID`) e registra o
ensaio de carga separadamente, evitando que uma execução apenas de carga
oculte a evidência da integração completa ou misture seus denominadores.

## Ajuste de precisão da automação de navegador

Na primeira regressão da imagem final, 37 dos 38 E2E passaram. O teste mobile
do Kanban esperava largura mínima de 44 pixels; `getBoundingClientRect()`
retornou **43,999996185302734** para o indicador de 44 pixels. A fixture passou
a normalizar a medição à precisão de 0,001 pixel antes de comparar com 44.
Uma largura de 43,99 continua reprovando. Nenhum comportamento da interface foi
alterado nem teste removido; a asserção funcional de tamanho mínimo foi mantida.
A falha e a captura foram preservadas em
`test-results/quality-assurance/piloto/falha-kanban-precisao` e na integração
`test-results/integracao-1793278889847`. Não é um novo defeito confirmado da
aplicação. A nova execução passou com os 38 E2E, sem retries; as outras suítes
e a varredura ainda estão sendo consolidadas.

## Varredura inicial e atualização dos pacotes da imagem UI

A primeira varredura identificou zero alertas HIGH/CRITICAL na API (Ubuntu e
bibliotecas Java), mas reprovou a UI com **uma ocorrência CRITICAL e duas HIGH**.
São duas CVEs em três pacotes: `CVE-2026-111497` em `brotli-libs 1.2.0-r1` e
`CVE-2026-92392` em `curl` e `libcurl 8.22.0-r0`, conforme a base Alpine Secdb
consultada pelo Trivy. A classificação é do scanner; não foi reproduzida
exploração no ERP. Os relatórios anteriores estão preservados em
`test-results/quality-assurance/piloto/imagens-antes-correcao`.

O estágio final do Dockerfile da UI passou a executar `apk upgrade --no-cache`.
A construção instalou `brotli-libs 1.2.1-r0` e `curl/libcurl 8.23.0-r0`, versões
indicadas como corrigidas pelo relatório. O achado foi agrupado como
**QA-BUG-012 — CRÍTICA**, referente à imagem distribuída, sem contar cada pacote
como defeito separado. A integração e a varredura finais precisam confirmar o
resultado antes de encerrar o achado. Não foram usados ignores, remoção de
scanners ou redução da severidade exigida.

Fontes de dados registradas no scanner: [Alpine Secdb](https://secdb.alpinelinux.org/).
A evidência desta rodada é o relatório local do Trivy, sua proveniência Secdb
e as versões efetivamente instaladas na construção.

## Fechamento final

Os nove critérios foram aprovados. Integração final: `test-results/integracao-1793281363426`.
As seis suítes e os 38 E2E passaram sem retries. A carga final na mesma imagem
API concluiu 100 leituras, zero erros, p95 de 6992 ms e máximo de
8193 ms. API: `sha256:6c5f6bfdc3ba71d61487c6c1bd6f433bf4e62a931e65d9c180333a305b73a41b`.
A nova varredura confirmou zero HIGH/CRITICAL na API e na UI; as versões
corrigidas de Brotli e curl/libcurl constam do inventário final.

QA-BUG-011 e 012 encerrados nesses escopos. Os resultados reprovados e a
falha de precisão da fixture permanecem preservados como histórico. Não houve
implantação, alteração do Nextcloud ou cópia real da VPS; esta última foi
adiada explicitamente pelo usuário. O dump fictício continua em Documentos.
Antes da operação, validar o destino HTTPS, o consumo conjunto com Nextcloud,
o espaço livre, os responsáveis e a rotina de backup real.

Snapshot atual: [validação final](evidencias/validacao-final-piloto-2026-10-29.json).
