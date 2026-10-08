-- Migration 004 — lien de réunion (Zoom, Meet, Teams…) sur les alarmes de groupe.
-- À exécuter dans Dashboard > SQL Editor. Idempotente.
alter table group_alarms add column if not exists link text;
