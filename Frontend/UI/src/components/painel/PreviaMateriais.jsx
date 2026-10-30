import css from './PreviaMateriais.module.css';

export function PreviaMateriais({ pedido }) {
  const materiais = Object.values((pedido.materiais || []).reduce((grupos, material) => {
    const chave = material.catalogoChave || material.nome;
    if (!grupos[chave]) grupos[chave] = { nome: material.nome, quantidade: 0 };
    grupos[chave].quantidade += Number(material.quantidadeSolicitada ?? material.quantidade ?? 0);
    return grupos;
  }, {}));
  return <span className={css.previa} aria-label="Resumo dos materiais">
    {materiais.slice(0, 2).map((material, indice) => <span key={indice}><b>{material.quantidade}×</b><span>{material.nome}</span></span>)}
    {materiais.length > 2 && <small>+{materiais.length - 2} {materiais.length === 3 ? 'material' : 'materiais'}</small>}
    {!materiais.length && <small>Sem materiais informados</small>}
  </span>;
}
