-- O servidor deixa de enviar mensagens. Preservamos os resultados históricos.
ALTER TABLE emails_pedidos DROP CONSTRAINT emails_pedidos_status_check;
ALTER TABLE emails_pedidos ADD CONSTRAINT emails_pedidos_status_check
    CHECK(status IN ('PENDENTE','ENVIANDO','ENVIADO','FALHA','INCERTO','PREPARADO','CANCELADO'));
ALTER TABLE emails_pedidos DROP CONSTRAINT emails_pedidos_provedor;
ALTER TABLE emails_pedidos ADD CONSTRAINT emails_pedidos_provedor
    CHECK(provedor IN ('locaweb','smtp','microsoft365','externo'));
UPDATE configuracao_email_compras SET automatico=FALSE, versao=versao+1;
UPDATE emails_pedidos SET status='CANCELADO', atualizado_em=CURRENT_TIMESTAMP,
    erro='Envio automático cancelado na migração para o cliente externo.',
    eventos=eventos || jsonb_build_array(jsonb_build_object('acao','ENVIO_AUTOMATICO_CANCELADO','instante',CURRENT_TIMESTAMP,'autor','sistema'))
    WHERE status='PENDENTE';
UPDATE emails_pedidos SET status='INCERTO', atualizado_em=CURRENT_TIMESTAMP,
    erro='Processamento anterior interrompido. Confira o resultado antes de enviar manualmente.',
    eventos=eventos || jsonb_build_array(jsonb_build_object('acao','RESULTADO_ANTERIOR_INCERTO','instante',CURRENT_TIMESTAMP,'autor','sistema'))
    WHERE status='ENVIANDO';
