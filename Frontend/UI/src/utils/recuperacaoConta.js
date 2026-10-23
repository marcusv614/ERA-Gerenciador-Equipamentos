export function tokenRecuperacaoDoFragmento(fragmento = '') {
  const parametros = new URLSearchParams(fragmento.replace(/^#/, ''));
  const token = parametros.get('recuperacao');
  return /^[A-Za-z0-9_-]{43}$/.test(token || '') ? token : '';
}

export function validarNovaSenhaRecuperacao(senha, confirmacao) {
  if (senha.length < 8 || senha.length > 128) return 'Use uma senha de 8 a 128 caracteres.';
  if (senha !== confirmacao) return 'A confirmação não corresponde à nova senha.';
  return '';
}
