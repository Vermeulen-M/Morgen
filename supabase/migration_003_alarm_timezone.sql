-- Migration 003 — fuseau horaire de l'admin + alarmes à date précise.
-- À exécuter dans Dashboard > SQL Editor. Idempotente.
alter table group_alarms add column if not exists timezone text;
alter table group_alarms add column if not exists date text; -- 'YYYY-MM-DD' = alarme unique, null = récurrente
alter table group_alarms alter column timezone_mode set default 'local';
