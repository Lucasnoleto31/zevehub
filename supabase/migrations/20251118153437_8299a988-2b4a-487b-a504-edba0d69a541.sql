-- Habilitar extensão pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Habilitar extensão pg_net para fazer requisições HTTP
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;