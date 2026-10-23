// CSV UTF-8 com BOM: Excel/LibreOffice. Nunca exportar fórmulas de conteúdo informado pelo usuário.
export function celulaCsv(valor) {
  let texto=String(valor??'');
  if(/^[\s\uFEFF]*[=+@\-\t\r]/u.test(texto))texto="'"+texto;
  return '"'+texto.replaceAll('"','""')+'"';
}
export function gerarCsv(linhas, formatarCelula=celulaCsv){return '\uFEFF'+linhas.map(l=>l.map(formatarCelula).join(';')).join('\r\n');}
export function dataRegistro(valor){
  if(!valor)return '';
  if(/^\d{4}-\d{2}-\d{2}$/.test(valor))return valor;
  const d=new Date(valor);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(d);
}
