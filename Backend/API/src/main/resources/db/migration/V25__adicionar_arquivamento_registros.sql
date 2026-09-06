ALTER TABLE funcionarios ADD COLUMN arquivado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE funcionarios ADD COLUMN arquivado_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE funcionarios ADD COLUMN arquivado_por VARCHAR(120);

ALTER TABLE obras ADD COLUMN arquivado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE obras ADD COLUMN arquivado_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE obras ADD COLUMN arquivado_por VARCHAR(120);

ALTER TABLE equipamentos ADD COLUMN arquivado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE equipamentos ADD COLUMN arquivado_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE equipamentos ADD COLUMN arquivado_por VARCHAR(120);

CREATE INDEX idx_funcionarios_arquivado ON funcionarios (arquivado);
CREATE INDEX idx_obras_arquivado ON obras (arquivado);
CREATE INDEX idx_equipamentos_arquivado ON equipamentos (arquivado);
