import { test, expect } from './test.mjs';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', erro => console.error('Erro de JavaScript no navegador:', erro.message));
  page.on('requestfailed', pedido => console.error('Falha ao carregar:', pedido.url(), pedido.failure()?.errorText));
  page.on('response', resposta => {
    if (resposta.status() >= 400 && !new URL(resposta.url()).pathname.startsWith('/api/')) console.error('Falha de recurso da interface:', resposta.status(), resposta.url());
  });
});

// Componentes reais, dados fictícios e API interceptada. Nenhum acesso ao banco da empresa.
const nome = 'Marina Oliveira';
const obras = [{ id: 1, nome: 'Obra Distrito Industrial', cidade: 'Manaus', responsaveis: [nome], status: 'Em andamento' }];
const equipamentos = [
  { id: 1, tipo: 'Ferramentas', modelo: 'Alicate de crimpagem', catalogoChave: 'ferramentas|alicate|', serie: 'ERA-001', obraId: 1, quantidade: 2, quantidadeDisponivel: 2, status: 'Em campo', historico: [] },
  { id: 2, tipo: 'EPI', modelo: 'Capacete de segurança', catalogoChave: 'epi|capacete|', obraId: 1, quantidade: 3, quantidadeDisponivel: 3, status: 'Em campo', historico: [] },
];
const material = (quantidade = 2) => ({ id: 1, nome: equipamentos[0].modelo, catalogoChave: equipamentos[0].catalogoChave, identificacao: 'ERA-001', quantidade });
const pedido = (id = 108, status = 'Em trânsito', extras = {}) => ({
  id, status, tecnico: nome, solicitante: nome, obraOrigemId: null, obraDestinoId: 1,
  dataSolicitacao: '2026-10-28', materiais: [material()], eventosFinanceiros: [], ...extras,
});
function bloqueio() {
  let liberar;
  const promessa = new Promise(resolve => { liberar = resolve; });
  return { promessa, liberar };
}

async function preparar(page, { perfil = 'TECNICO', pedidos = [pedido()], itens = equipamentos, locais = obras, escrever, antesDeLer, aguardarCarga = true } = {}) {
  const estado = { pedidos, mutacoes: [], falhas: new Map(), leituras: [] };
  await page.route('http://127.0.0.1:4179/api/**', async route => {
    const req = route.request(), rota = new URL(req.url()).pathname;
    if (req.method() !== 'GET') {
      const mutacao = { rota, corpo: req.postDataJSON() }; estado.mutacoes.push(mutacao);
      if (escrever && await escrever(route, mutacao, estado)) return;
      if (rota === '/api/atividades') {
        const id = Math.max(108, ...estado.pedidos.map(item => item.id)) + 1;
        const novo = pedido(id, 'Pendente', mutacao.corpo); estado.pedidos.unshift(novo);
        return route.fulfill({ status: 201, json: novo });
      }
      if (rota.endsWith('/conclusao')) {
        const id = Number(rota.split('/')[3]);
        const atual = estado.pedidos.find(p => p.id === id);
        atual.status = 'Concluída';
        return route.fulfill({ json: atual });
      }
      if (rota.endsWith('/cancelamento')) {
        return route.fulfill({ json: { status: 'Cancelamento solicitado', podeSolicitar: false, historico: [{ descricao: mutacao.corpo.motivo, autorNome: nome, registradoEm: '2026-10-30T12:00:00Z' }] } });
      }
      return route.fulfill({ status: 403, json: { mensagem: 'Operação não autorizada.' } });
    }
    estado.leituras.push(rota);
    if (antesDeLer) await antesDeLer(rota, estado);
    if (estado.falhas.has(rota)) return route.fulfill({ status: 503, json: { mensagem: estado.falhas.get(rota) } });
    if (rota.endsWith('/cancelamento')) return route.fulfill({ json: { status: 'Pendente', podeSolicitar: true, historico: [{ descricao: 'Pedido registrado.', autorNome: nome, registradoEm: '2026-10-28T12:00:00Z' }] } });
    const respostas = {
      '/api/auth/me': { id: 9, funcionarioId: 1, nome, login: 'qa.marina', perfil, deveAlterarSenha: false },
      '/api/auth/csrf': { token: 'qa-csrf' },
      '/api/auth/recuperacao/configuracao': { disponivel: false, obrigatorio: false },
      '/api/notificacoes': { itens: [], naoLidas: 0, temMais: false },
      '/api/obras': locais, '/api/equipamentos': itens, '/api/equipamentos/catalogo': itens,
      '/api/atividades': estado.pedidos,
      '/api/usuarios': [{ id: 9, nome, login: 'qa.marina', perfil, ativo: true }],
      '/api/funcionarios': [{ id: 1, nome, status: 'Ativo' }],
    };
    return route.fulfill({ json: respostas[rota] ?? [] });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Sair do sistema' })).toBeVisible({ timeout: 15000 });
  if (aguardarCarga) await expect(page.getByText('Sincronizando o campo...', { exact: true })).toHaveCount(0);
  return estado;
}
async function selecionarOperacao(page, operacao = 'Pedir material') {
  await page.getByRole('button', { name: new RegExp(`^${operacao}`) }).click();
  await page.getByRole('button', { name: /Obra Distrito Industrial/ }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
}
const quantidade = (page, modelo = equipamentos[0].modelo) => page.getByRole('textbox', { name: `Quantidade de ${modelo}`, exact: true });
async function acompanhar(page) {
  await page.getByRole('navigation', { name: /Navegação do/ }).getByRole('button', { name: /Meus pedidos/ }).click();
  await expect(page.getByRole('heading', { name: 'Meus pedidos', exact: true })).toBeVisible();
}
async function abrirRecebimento(page) {
  await acompanhar(page);
  await page.locator('#pedido-tecnico-108').getByRole('button', { name: 'Confirmar recebimento', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Receber pedido #0108', exact: true });
  await expect(modal).toBeVisible();
  return modal;
}
async function semOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

test('Campo: digitar seleciona; revisão preserva quantidade, obra e observação; envio único', async ({ page }) => {
  const trava = bloqueio();
  const estado = await preparar(page, { escrever: async (_route, mutacao) => { if (mutacao.rota === '/api/atividades') await trava.promessa; } });
  await expect(page.locator('[data-tecnico-campo="true"]')).toHaveCount(1);
  await selecionarOperacao(page);
  await expect(page.getByRole('button', { name: /Selecionar Capacete/ })).toHaveCount(0);
  await quantidade(page).fill('3');
  await expect(page.getByRole('button', { name: 'Desmarcar Alicate de crimpagem', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Selecionado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Revisar 3 itens', exact: true }).click();
  await expect(page.getByLabel('Resumo da solicitação')).toContainText('Entregar em Obra Distrito Industrial');
  await quantidade(page).fill('1,5');
  await expect(page.getByRole('button', { name: /Enviar ao gerente/ })).toBeDisabled();
  await expect(quantidade(page)).toHaveAccessibleDescription('Use um número inteiro, como 1, 2 ou 3.');
  await quantidade(page).fill('4');
  await page.getByRole('button', { name: 'Adicionar observação', exact: true }).click();
  await page.getByRole('textbox', { name: /Observação/ }).fill('Conferir com a encarregada.');
  const enviar = page.getByRole('button', { name: /Enviar ao gerente/ });
  // Dois eventos no mesmo ciclo exercitam a proteção contra toques repetidos.
  await enviar.evaluate(el => { el.click(); el.click(); });
  await expect.poll(() => estado.mutacoes.length).toBe(1);
  await expect(page.getByRole('button', { name: /Enviando/ })).toBeDisabled();
  trava.liberar();
  await expect(page.locator('#pedido-tecnico-109')).toBeFocused();
  expect(estado.mutacoes).toHaveLength(1);
  expect(estado.mutacoes[0]).toMatchObject({ rota: '/api/atividades', corpo: { obraDestinoId: 1, obraOrigemId: null, observacao: 'Conferir com a encarregada.', materiais: [{ nome: 'Alicate de crimpagem', quantidade: 4, identificacao: null, catalogoChave: equipamentos[0].catalogoChave }] } });
});

test('Campo: entradas inválidas ficam visíveis com erro acessível e impedem revisão', async ({ page }) => {
  await preparar(page); await selecionarOperacao(page);
  for (const valor of ['1,5', '1.5', '-2', 'abc', '', '0', '2147483648']) {
    await quantidade(page).fill(valor); await quantidade(page).press('Tab');
    await expect(quantidade(page)).toHaveValue(valor);
    await expect(quantidade(page)).toHaveAttribute('aria-invalid', 'true');
    await expect(quantidade(page)).toHaveAccessibleDescription(/Informe a quantidade|número inteiro|pelo menos 1|máxima/);
    await expect(page.getByRole('button', { name: /^Revisar \d+ ite/ })).toBeDisabled();
  }
  await quantidade(page).fill('2');
  await expect(quantidade(page)).toHaveAttribute('aria-invalid', 'false');
  await expect(page.getByRole('button', { name: 'Revisar 2 itens', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Desmarcar Alicate de crimpagem', exact: true }).click();
  await expect(quantidade(page)).toHaveValue('0');
  await expect(page.getByRole('button', { name: /^Revisar/ })).toBeDisabled();
});

test('Campo: devolução respeita saldo, mantém identificação e impede quantidade acima do disponível', async ({ page }) => {
  const estado = await preparar(page); await selecionarOperacao(page, 'Devolver material');
  await quantidade(page).fill('3');
  await expect(quantidade(page)).toHaveAccessibleDescription('A quantidade máxima é 2.');
  await expect(page.getByRole('button', { name: /^Revisar/ })).toBeDisabled();
  await quantidade(page).fill('2');
  await expect(page.getByRole('button', { name: 'Aumentar quantidade de Alicate de crimpagem', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Revisar 2 itens', exact: true }).click();
  await page.getByRole('button', { name: /Enviar ao gerente/ }).click();
  await expect(page.locator('#pedido-tecnico-109')).toBeVisible();
  expect(estado.mutacoes[0].corpo).toMatchObject({ obraOrigemId: 1, obraDestinoId: null, materiais: [{ quantidade: 2, identificacao: 'ERA-001', catalogoChave: equipamentos[0].catalogoChave }] });
});

test('Campo: erro de envio mantém revisão e permite nova tentativa explícita', async ({ page }) => {
  let falhar = true;
  const estado = await preparar(page, { escrever: async (route, mutacao) => {
    if (mutacao.rota === '/api/atividades' && falhar) { await route.fulfill({ status: 409, json: { mensagem: 'Revise os materiais e tente novamente.' } }); return true; }
  } });
  await selecionarOperacao(page); await quantidade(page).fill('2');
  await page.getByRole('button', { name: 'Revisar 2 itens', exact: true }).click();
  await page.getByRole('button', { name: /Enviar ao gerente/ }).click();
  await expect(page.getByRole('alert')).toContainText('Revise os materiais e tente novamente.');
  await expect(quantidade(page)).toHaveValue('2');
  expect(estado.mutacoes).toHaveLength(1);
  falhar = false;
  await page.getByRole('button', { name: /Enviar ao gerente/ }).click();
  await expect(page.locator('#pedido-tecnico-109')).toBeVisible();
  expect(estado.mutacoes).toHaveLength(2);
  expect(estado.mutacoes[0].corpo).toEqual(estado.mutacoes[1].corpo);
});

test('Campo: grupos usam estados reais; detalhes preservam materiais, registros e cancelamento', async ({ page }) => {
  const estados = ['Pendente', 'Aguardando financeiro', 'Aprovada', 'Aguardando coleta', 'Em trânsito', 'Concluída', 'Rejeitada', 'Cancelamento solicitado', 'Cancelada'];
  const pedidos = estados.map((status, indice) => pedido(100 + indice, status));
  pedidos[0] = pedido(100, 'Pendente', { solicitacaoPaiId: 90, observacao: 'Entregar no portão 2.', materiais: [material(), { id: 2, nome: 'Escada extensível', quantidade: 1 }, { id: 3, nome: 'Conector óptico', quantidade: 20 }], eventosFinanceiros: [{ tipo: 'REJEICAO', descricao: 'Justificativa preservada.', autorNome: 'Ana Gestora', registradoEm: '2026-10-28T12:00:00Z' }] });
  const estado = await preparar(page, { pedidos }); await acompanhar(page);
  await expect(page.getByRole('region', { name: 'Para receber', exact: true }).getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Em andamento', exact: true }).getByRole('article')).toHaveCount(5);
  await expect(page.getByRole('region', { name: 'Pedidos anteriores', exact: true }).getByRole('article')).toHaveCount(3);
  for (const [indice, status] of estados.entries()) await expect(page.locator(`#pedido-tecnico-${100 + indice}`).locator('[data-status]')).toHaveText(status);
  const card = page.locator('#pedido-tecnico-100');
  await expect(card.getByText('Entregar no portão 2.', { exact: true })).toBeHidden();
  await card.locator('summary').click();
  for (const texto of ['Entregar no portão 2.', 'Conector óptico', 'Identificação: ERA-001', 'Justificativa preservada.', 'Ana Gestora', '#90']) await expect(card.getByText(texto, { exact: true })).toBeVisible();
  await card.getByRole('button', { name: 'Cancelamento e histórico · #100', exact: true }).click();
  await expect(card.getByText('Pedido registrado.', { exact: true })).toBeVisible();
  await card.getByRole('textbox', { name: /Justificativa do cancelamento/ }).fill('Pedido duplicado pela equipe.');
  const cancelar = card.getByRole('button', { name: 'Solicitar cancelamento', exact: true });
  await expect(cancelar).toBeDisabled();
  await card.getByRole('checkbox').check(); await cancelar.click();
  await expect(card.getByText('Pedido duplicado pela equipe.', { exact: true })).toBeVisible();
  expect(estado.mutacoes).toEqual([{ rota: '/api/atividades/100/cancelamento', corpo: { motivo: 'Pedido duplicado pela equipe.', conferenciaFisica: false } }]);
});

test('Campo: recebimento parcial identifica o atendimento, confirma uma única vez e mantém foco', async ({ page }) => {
  const trava = bloqueio();
  const estado = await preparar(page, { pedidos: [pedido(108, 'Em trânsito', { solicitacaoPaiId: 80, materiaisOriginais: [material(10)] })], escrever: async (_route, mutacao) => { if (mutacao.rota.endsWith('/conclusao')) await trava.promessa; } });
  const modal = await abrirRecebimento(page);
  await expect(modal.getByLabel('Materiais para confirmar recebimento')).toHaveText('2×Alicate de crimpagem');
  await expect(modal).toContainText('parte do pedido #80');
  expect(estado.mutacoes).toHaveLength(0);
  await modal.getByRole('button', { name: 'Confirmar recebimento', exact: true }).evaluate(el => { el.click(); el.click(); });
  await expect.poll(() => estado.mutacoes.length).toBe(1);
  await expect(modal.getByRole('button', { name: 'Confirmando…', exact: true })).toBeDisabled();
  trava.liberar();
  await expect(modal).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Pedidos anteriores', exact: true }).locator('#pedido-tecnico-108')).toBeVisible();
  await expect(page.locator('#pedido-tecnico-108')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Confirmar recebimento', exact: true })).toHaveCount(0);
  expect(estado.mutacoes).toEqual([{ rota: '/api/atividades/108/conclusao', corpo: null }]);
});

test('Campo: modal tem foco contido, Escape e retorno sem movimentação de estoque', async ({ page }) => {
  const estado = await preparar(page); const modal = await abrirRecebimento(page);
  await expect(modal).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(modal.getByRole('button', { name: 'Confirmar recebimento', exact: true })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(modal.getByRole('button', { name: 'Fechar', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(page.locator('#pedido-tecnico-108').getByRole('button', { name: 'Confirmar recebimento', exact: true })).toBeFocused();
  expect(estado.mutacoes).toHaveLength(0);
});

test('Campo: recusa da API mantém o recebimento aberto e permite tentar novamente', async ({ page }) => {
  let falhar = true;
  const estado = await preparar(page, { escrever: async (route, mutacao) => {
    if (mutacao.rota.endsWith('/conclusao') && falhar) { await route.fulfill({ status: 403, json: { mensagem: 'Você não pode confirmar este recebimento.' } }); return true; }
  } });
  const modal = await abrirRecebimento(page);
  await modal.getByRole('button', { name: 'Confirmar recebimento', exact: true }).click();
  await expect(modal.getByRole('alert')).toHaveText('Você não pode confirmar este recebimento.');
  await expect(modal.getByRole('button', { name: 'Confirmar recebimento', exact: true })).toBeEnabled();
  await expect(page.locator('#pedido-tecnico-108').locator('[data-status]')).toHaveText('Em trânsito');
  falhar = false;
  await modal.getByRole('button', { name: 'Confirmar recebimento', exact: true }).click();
  await expect(modal).toHaveCount(0); expect(estado.mutacoes).toHaveLength(2);
});

test('Campo: atualização do pedido invalida confirmação aberta e devoluções não exibem recebimento', async ({ page }) => {
  const estado = await preparar(page, { pedidos: [pedido(), pedido(107, 'Em trânsito', { obraOrigemId: 1, obraDestinoId: null }), pedido(106, 'Aprovada')] });
  const modal = await abrirRecebimento(page);
  estado.pedidos[0].status = 'Cancelamento solicitado';
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(modal.getByRole('status')).toContainText('Cancelamento solicitado');
  await expect(modal.getByRole('button', { name: 'Confirmar recebimento', exact: true })).toBeDisabled();
  await modal.getByRole('button', { name: 'Voltar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Confirmar recebimento', exact: true })).toHaveCount(0);
  expect(estado.mutacoes).toHaveLength(0);
});

test('Campo: carregamento, falha de consulta e recuperação explícita não enviam solicitações', async ({ page }) => {
  const trava = bloqueio();
  const estado = await preparar(page, { aguardarCarga: false, antesDeLer: async (rota, atual) => {
    if (rota === '/api/obras') { await trava.promessa; atual.falhas.set(rota, 'Não foi possível carregar as obras.'); }
  } });
  await expect(page.getByRole('status').filter({ hasText: 'Sincronizando o campo...' })).toBeVisible();
  trava.liberar();
  await expect(page.getByRole('alert')).toContainText('Não foi possível concluir a operação. Tente novamente.');
  // Substitui somente a resposta de leitura da obra, sem alterar os demais mocks.
  await page.route('http://127.0.0.1:4179/api/obras', route => route.fulfill({ json: obras }));
  await page.getByRole('button', { name: 'Atualizar dados', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Pedir material/ })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(estado.mutacoes).toHaveLength(0);
});

test('Campo: ausência de pedidos, de materiais e de obras apresenta caminhos claros', async ({ page }) => {
  await preparar(page, { pedidos: [], itens: [] }); await acompanhar(page);
  await expect(page.getByRole('heading', { name: 'Nenhum pedido ainda', exact: true })).toBeVisible();
  await page.getByRole('main').getByRole('button', { name: 'Novo pedido', exact: true }).last().click();
  await selecionarOperacao(page);
  await expect(page.getByText('Nenhum material encontrado', { exact: true })).toBeVisible();
  await expect(page.getByText('Fale com o responsável pelo estoque.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await selecionarOperacao(page, 'Devolver material');
  await expect(page.getByText('Não há materiais disponíveis para devolver nesta obra.', { exact: true })).toBeVisible();
  await page.route('http://127.0.0.1:4179/api/obras', route => route.fulfill({ json: [] }));
  await page.reload();
  await expect(page.getByText('Nenhuma obra atribuída', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Pedir material/ })).toHaveCount(0);
});

test('Campo: áreas de toque, nomes longos, temas e larguras de celular', async ({ page }, info) => {
  const longo = 'Material para instalação da rede óptica com nome extenso e especificação operacional';
  await preparar(page, { itens: [{ ...equipamentos[0], modelo: longo }] }); await selecionarOperacao(page);
  await quantidade(page, longo).fill('2');
  const controles = [quantidade(page, longo), page.getByRole('button', { name: `Diminuir quantidade de ${longo}`, exact: true }), page.getByRole('button', { name: `Aumentar quantidade de ${longo}`, exact: true }), page.getByRole('button', { name: `Desmarcar ${longo}`, exact: true })];
  for (const controle of controles) { const caixa = await controle.boundingBox(); expect(caixa.width).toBeGreaterThanOrEqual(44); expect(caixa.height).toBeGreaterThanOrEqual(44); }
  await page.screenshot({ path: info.outputPath('campo-catalogo-claro.png'), fullPage: true });
  await page.getByRole('button', { name: 'Ativar tema escuro', exact: true }).click();
  for (const width of [320, 390, 640]) { await page.setViewportSize({ width, height: 844 }); await semOverflow(page); }
  await page.getByRole('button', { name: 'Revisar 2 itens', exact: true }).click();
  await semOverflow(page);
  await page.getByRole('button', { name: /Enviar ao gerente/ }).click();
  await expect(page.locator('#pedido-tecnico-109')).toBeVisible(); await semOverflow(page);
  await page.screenshot({ path: info.outputPath('campo-pedidos-escuro.png'), fullPage: true });
  const modal = await abrirRecebimento(page); await semOverflow(page);
  await page.screenshot({ path: info.outputPath('campo-recebimento-escuro.png'), fullPage: true });
  await expect(modal.getByRole('button', { name: 'Confirmar recebimento', exact: true })).toBeVisible();
});

test('TST: catálogo EPI, solicitação, devolução e recebimento preservam experiência e contratos', async ({ page }) => {
  const estado = await preparar(page, { perfil: 'TST', pedidos: [pedido(108, 'Em trânsito', { materiais: [{ id: 2, nome: 'Capacete de segurança', quantidade: 2 }] })] });
  await expect(page.locator('[data-tecnico-campo="true"]')).toHaveCount(0);
  await selecionarOperacao(page, 'Pedir EPI');
  await expect(page.getByRole('button', { name: /Selecionar Alicate/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Selecionar Capacete de segurança', exact: true }).click();
  await quantidade(page, 'Capacete de segurança').fill('2'); await quantidade(page, 'Capacete de segurança').press('Tab');
  await page.getByRole('button', { name: 'Revisar 2 itens', exact: true }).click();
  await page.getByRole('button', { name: /Enviar ao RH/ }).click();
  await expect(page.locator('#pedido-tecnico-109')).toBeVisible();
  expect(estado.mutacoes[0].corpo.materiais).toEqual([{ nome: 'Capacete de segurança', quantidade: 2, identificacao: null, catalogoChave: equipamentos[1].catalogoChave }]);
  await page.locator('#pedido-tecnico-108').getByRole('button', { name: 'Confirmar recebimento', exact: true }).click();
  await expect(page.locator('#pedido-tecnico-108')).toContainText('Finalizada');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Navegação do TST', exact: true }).getByRole('button', { name: 'Novo pedido', exact: true }).click();
  await selecionarOperacao(page, 'Devolver EPI');
  await page.getByRole('button', { name: 'Selecionar Capacete de segurança', exact: true }).click();
  await quantidade(page, 'Capacete de segurança').fill('3'); await quantidade(page, 'Capacete de segurança').press('Tab');
  await expect(page.getByRole('button', { name: 'Aumentar quantidade de Capacete de segurança', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Revisar 3 itens', exact: true }).click();
  await page.getByRole('button', { name: /Enviar ao RH/ }).click();
  await expect.poll(() => estado.mutacoes.length).toBe(3);
  expect(estado.mutacoes[2].corpo).toMatchObject({ obraOrigemId: 1, obraDestinoId: null, materiais: [{ nome: 'Capacete de segurança', quantidade: 3 }] });
});

test('Administrador: consultas Técnico e TST mantêm visualização sem ações de escrita', async ({ page }, info) => {
  const estado = await preparar(page, { perfil: 'ADMIN' });
  for (const area of ['tecnico', 'tst']) {
    if (info.project.name === 'qa-mobile') await page.getByRole('combobox', { name: 'Escolher área administrativa', exact: true }).selectOption(area);
    else await page.getByRole('navigation', { name: 'Áreas administrativas', exact: true }).getByRole('button', { name: area === 'tecnico' ? 'Técnico' : 'TST', exact: true }).click();
    await expect(page.getByRole('heading', { name: area === 'tecnico' ? 'Pedidos do técnico' : 'Pedidos do TST', exact: true })).toBeVisible();
    await expect(page.locator('#pedido-tecnico-108')).toContainText('Em trânsito');
    await expect(page.locator('[data-tecnico-campo="true"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Confirmar recebimento', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Cancelamento e histórico/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Novo pedido', exact: true })).toHaveCount(0);
    await page.getByRole('navigation', { name: /Navegação do/ }).getByRole('button', { name: 'Materiais', exact: true }).click();
    await expect(page.getByText(area === 'tecnico' ? 'Alicate de crimpagem' : 'Capacete de segurança', { exact: true })).toBeVisible();
    await expect(page.getByText(area === 'tecnico' ? 'Capacete de segurança' : 'Alicate de crimpagem', { exact: true })).toHaveCount(0);
    await semOverflow(page);
  }
  expect(estado.mutacoes).toHaveLength(0);
});
