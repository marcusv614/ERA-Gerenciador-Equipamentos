import { Cable, Radio, Wrench } from 'lucide-react';

export const obrasIniciais = [];
export const equipamentosIniciais = [];
export const funcionariosIniciais = [];
export const solicitacoesIniciais = [];

export const tiposEquipamento = ['Fluke', 'OTDR', 'Máquina de fusão', 'Rotuladora', 'Outro'];
export const statusEquipamento = ['Em campo', 'Em estoque', 'Em manutenção', 'Em trânsito'];
export const statusObra = ['Planejada', 'Em andamento', 'Concluída'];
export const iconePorTipoEquipamento = { Fluke: Cable, OTDR: Radio, 'Máquina de fusão': Wrench, Rotuladora: Wrench, Outro: Wrench };
