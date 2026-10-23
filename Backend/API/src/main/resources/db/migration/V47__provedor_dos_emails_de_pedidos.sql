-- Os registros existentes preservam o provedor com que foram criados.
ALTER TABLE emails_pedidos ADD COLUMN provedor VARCHAR(20) NOT NULL DEFAULT 'microsoft365';
ALTER TABLE emails_pedidos ADD CONSTRAINT emails_pedidos_provedor CHECK(provedor IN ('locaweb','smtp','microsoft365'));
CREATE INDEX emails_pedidos_fila_provedor ON emails_pedidos(provedor,status,proxima_tentativa);
