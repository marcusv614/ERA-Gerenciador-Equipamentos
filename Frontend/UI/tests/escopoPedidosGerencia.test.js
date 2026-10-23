import assert from 'node:assert/strict';
import { pedidosDoPerfil } from '../src/utils/acompanhamentoSolicitacao.js';
const comum={id:1,materiais:[{catalogoChave:'ferramentas|alicate|'}]};
const epi={id:2,materiais:[{catalogoChave:'epi|capacete|'}]};
const legado={id:3,materiais:[{catalogoChave:'segurança, epi e acesso|luva|'}]};
const original={id:4,materiais:comum.materiais,materiaisOriginais:epi.materiais};
assert.deepEqual(pedidosDoPerfil([comum,epi,legado,original],'GERENTE'),[comum]);
assert.deepEqual(pedidosDoPerfil([comum,epi],'ADMIN'),[comum,epi]);
assert.deepEqual(pedidosDoPerfil([epi],'RH'),[epi]);
