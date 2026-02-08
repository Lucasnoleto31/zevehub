
-- Passo 1: Truncar notificações (52M+ registros)
TRUNCATE TABLE notifications CASCADE;

-- Passo 2: Limpar classificações de IA vinculadas
DELETE FROM ai_classification_logs WHERE operation_id IS NOT NULL;

-- Passo 3: Truncar operações
TRUNCATE TABLE trading_operations CASCADE;
