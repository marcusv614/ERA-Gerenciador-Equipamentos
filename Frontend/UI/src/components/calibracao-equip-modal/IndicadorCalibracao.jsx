import { ehFluke, resumoCalibracao } from '../../utils/calibracoes';
import css from './CalibracaoEquipModal.module.css';

export function IndicadorCalibracao({ equipamento }) {
  if(!ehFluke(equipamento)&&!equipamento.calibracoes?.length)return null;
  const resumo=resumoCalibracao(equipamento);
  return <p className={css.indicador} data-situacao={resumo.chave}>{resumo.texto}</p>;
}
