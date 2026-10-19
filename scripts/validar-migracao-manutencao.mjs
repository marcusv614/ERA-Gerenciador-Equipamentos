import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,''));
assert.match(config.database,/^era_auditoria_smoke_\d{14}$/);
assert.match(config.container,/^era-auditoria-smoke-\d{14}$/);
assert.equal(config.database.slice(-14),config.container.slice(-14));
const migracao=fs.readFileSync(new URL('../Backend/API/src/main/resources/db/migration/V33__registrar_manutencoes_equipamentos.sql',import.meta.url),'utf8');
assert.ok(migracao.includes('-- Preservar'));
const sql=`BEGIN;
INSERT INTO equipamentos(tipo,modelo,serie,status,quantidade,quantidade_reservada,controle_quantidade)
VALUES('Ferramentas','Legado de teste','LEGADO-MANUT-TESTE','MANUTENCAO',5,1,'LOTE');
${migracao.slice(migracao.indexOf('-- Preservar'))}
DO $teste$ BEGIN
IF NOT EXISTS (SELECT 1 FROM equipamentos e JOIN manutencoes_equipamentos m ON m.equipamento_id=e.id
    WHERE e.serie='LEGADO-MANUT-TESTE' AND e.quantidade=5 AND e.quantidade_reservada=1
      AND e.status='Em estoque' AND m.quantidade=4 AND m.aberta_em IS NULL
      AND m.aberta_por_nome IS NULL AND m.aberta_por_login IS NULL AND m.concluida_em IS NULL)
THEN RAISE EXCEPTION 'A migracao nao preservou corretamente a manutencao anterior'; END IF;
END; $teste$;
ROLLBACK;`;
execFileSync('docker',['exec','-i','era-erp-dev-database-1','psql','-X','-v','ON_ERROR_STOP=1','-U',process.argv[3],'-d',config.database],{input:sql,encoding:'utf8'});
console.log('Migracao V33: manutencao anterior preserva quantidade, reservas e ausencia de data/autoria informadas.');
