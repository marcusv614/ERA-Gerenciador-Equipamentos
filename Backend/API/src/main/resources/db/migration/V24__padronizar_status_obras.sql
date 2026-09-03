UPDATE obras
SET status = CASE
    WHEN LOWER(TRIM(status)) IN ('concluída', 'concluida') THEN 'Concluída'
    ELSE 'Em andamento'
END;

ALTER TABLE obras
    ADD CONSTRAINT ck_obras_status
    CHECK (status IN ('Em andamento', 'Concluída'));
