import { test,expect } from './test.mjs';

// App e painéis reais com conjuntos vazios; não substitui os E2E com banco real.
for(const [indice,perfil] of ['ADMIN','GERENTE','RH','FINANCEIRO','ESTOQUE','TECNICO','TST'].entries()) {
  test(`QA-JSX-${16+indice}: painel ${perfil}, tema, navegação e logout`,async({page})=>{
    const erros=[];page.on('pageerror',e=>erros.push(e.message));let logado=true;
    await page.route('http://127.0.0.1:4179/api/**',r=>{
      const rota=new URL(r.request().url()).pathname;
      if(rota==='/api/auth/me')return r.fulfill(logado?{json:{id:9,funcionarioId:1,nome:`QA ${perfil}`,login:'qa.painel',perfil,deveAlterarSenha:false}}:{status:401,json:{mensagem:'Sessão encerrada.'}});
      if(rota==='/api/auth/csrf')return r.fulfill({json:{token:'qa-csrf-ficticio'}});
      if(rota==='/api/auth/logout'){logado=false;return r.fulfill({status:204});}
      if(rota==='/api/auth/recuperacao/configuracao')return r.fulfill({json:{disponivel:false,obrigatorio:false}});
      if(rota==='/api/notificacoes')return r.fulfill({json:{itens:[],naoLidas:0,temMais:false}});
      return r.fulfill({json:[]});
    });
    await page.goto('/');await expect(page.getByRole('button',{name:'Sair do sistema'})).toBeVisible();
    if(['GERENTE','RH','FINANCEIRO'].includes(perfil)) {
      await page.getByRole('button',{name:/Solicitações/}).filter({visible:true}).first().click();
      await page.getByRole('button',{name:'Kanban',exact:true}).click();
      await expect(page.getByRole('region',{name:'Kanban de solicitações',exact:true})).toBeVisible();
    }
    if(['TECNICO','TST'].includes(perfil)) {
      await page.getByRole('button',{name:/Meus pedidos/}).click();
      await expect(page.getByRole('heading',{name:'Meus pedidos',exact:true})).toBeVisible();
    }
    if(perfil==='ESTOQUE')for(const periodo of ['Hoje','Semana','Mês'])await page.getByRole('button',{name:periodo,exact:true}).click();
    if(['RH','FINANCEIRO'].includes(perfil)) {
      await expect(page.getByRole('button',{name:'Equipamento',exact:true})).toHaveCount(0);
      await expect(page.getByRole('button',{name:'Funcionário',exact:true})).toHaveCount(0);
    }
    await page.getByRole('button',{name:'Ativar tema escuro',exact:true}).click();
    await expect(page.getByRole('button',{name:'Ativar tema claro',exact:true})).toBeVisible();
    expect(erros).toEqual([]);
    await page.getByRole('button',{name:'Sair do sistema'}).click();
    await expect(page.getByRole('heading',{name:'Acesse o painel'})).toBeVisible();
    await page.reload();await expect(page.getByRole('heading',{name:'Acesse o painel'})).toBeVisible();
  });
}
