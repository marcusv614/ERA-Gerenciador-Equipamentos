import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EstruturaModal } from '../src/components/modal-shell/ModalShell';

export default function Fixture() {
  const [aberto, abrir] = useState(false);
  const [filho, abrirFilho] = useState(false);
  return <main>
    <button onClick={() => abrir(true)}>Abrir diálogo</button>
    {aberto && <EstruturaModal titulo="Diálogo QA" aoFechar={() => abrir(false)}>
      <label>Campo QA<input /></label>
      <button onClick={() => abrirFilho(true)}>Abrir filho</button>
      {filho && <EstruturaModal titulo="Filho QA" aoFechar={() => abrirFilho(false)}>
        <label>Campo filho<input /></label>
      </EstruturaModal>}
    </EstruturaModal>}
  </main>;
}

createRoot(document.getElementById('root')).render(<Fixture />);
