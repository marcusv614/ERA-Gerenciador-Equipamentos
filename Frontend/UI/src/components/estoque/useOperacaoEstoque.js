import { useCallback, useRef, useState } from 'react';

export function useOperacaoEstoque(definirMensagem) {
  const ocupado = useRef(false);
  const [processando, definirProcessando] = useState(false);
  const executar = useCallback(async acao => {
    if (ocupado.current) return { sucesso: false, erro: 'Aguarde a operação em andamento.' };
    ocupado.current = true; definirProcessando(true); definirMensagem(null);
    try { return { sucesso: true, dados: await acao() }; }
    catch (falha) { const erro = falha.message || 'Não foi possível concluir a operação.'; definirMensagem({ tipo: 'erro', texto: erro }); return { sucesso: false, erro }; }
    finally { ocupado.current = false; definirProcessando(false); }
  }, [definirMensagem]);
  return { processando, executar };
}
