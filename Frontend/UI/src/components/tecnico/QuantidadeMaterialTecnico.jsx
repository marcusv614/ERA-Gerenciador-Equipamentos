import { useId } from 'react';
import { Minus, Plus } from 'lucide-react';
import css from './TecnicoCampo.module.css';

export function QuantidadeMaterialTecnico({ nome, quantidade, valor, limite, erro, aoEditar, aoAjustar }) {
  const id = useId();
  const erroId = `${id}-erro`;
  return <div className={css.campoQuantidade} data-controle-quantidade>
    <label htmlFor={id}>Quantidade</label>
    <div className={css.controlesQuantidade} role="group" aria-label={`Quantidade de ${nome}`}>
      <button type="button" disabled={!quantidade} aria-label={`Diminuir quantidade de ${nome}`} onClick={() => aoAjustar(quantidade - 1)}><Minus size={18} /></button>
      <input id={id} type="text" inputMode="numeric" pattern="[0-9]*" enterKeyHint="done"
        aria-label={`Quantidade de ${nome}`} aria-invalid={Boolean(erro)} aria-describedby={erro ? erroId : undefined}
        value={valor} onFocus={evento => evento.currentTarget.select()}
        onChange={evento => aoEditar(evento.target.value)}
        onKeyDown={evento => { if (evento.key === 'Enter') evento.currentTarget.blur(); }} />
      <button type="button" disabled={quantidade >= limite} aria-label={`Aumentar quantidade de ${nome}`} onClick={() => aoAjustar(quantidade + 1)}><Plus size={18} /></button>
    </div>
    {erro && <p id={erroId} className={css.erroQuantidade} aria-live="polite">{erro}</p>}
  </div>;
}
