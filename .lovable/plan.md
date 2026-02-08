

# Limpeza Completa do Banco de Dados - /operations

## Situacao Atual

| Tabela | Registros |
|--------|-----------|
| `trading_operations` | 75.260 |
| `notifications` (vinculadas) | ~52.247.037 |
| `ai_classification_logs` (vinculadas) | 0 |

O volume massivo de notificacoes (~52 milhoes) e a causa raiz dos timeouts em tentativas anteriores. A exclusao em cascata tenta remover todas essas notificacoes junto com cada operacao, causando estouro de tempo.

## Plano de Execucao

### Passo 1: Limpar notificacoes vinculadas primeiro
Executar via migracao SQL um `TRUNCATE` na tabela `notifications` (ou pelo menos `DELETE` das vinculadas a operacoes). Como sao ~52 milhoes de registros, o `TRUNCATE` e a unica abordagem viavel.

### Passo 2: Limpar tabela principal
Apos remover as dependencias, executar `TRUNCATE TABLE trading_operations CASCADE` para limpar todas as operacoes.

### SQL a ser executado (via migracao)

```text
-- Passo 1: Truncar notificacoes (52M+ registros - DELETE seria inviavel)
TRUNCATE TABLE notifications CASCADE;

-- Passo 2: Limpar classificacoes de IA (por seguranca)
DELETE FROM ai_classification_logs WHERE operation_id IS NOT NULL;

-- Passo 3: Truncar operacoes
TRUNCATE TABLE trading_operations CASCADE;
```

## Detalhes Tecnicos

- **Por que TRUNCATE em vez de DELETE?** O `TRUNCATE` nao dispara triggers por linha e ignora o overhead transacional, tornando-o instantaneo mesmo para milhoes de registros. O `DELETE` de 52M de notificacoes causaria timeout inevitavelmente.
- **Nota sobre notificacoes:** O `TRUNCATE TABLE notifications CASCADE` removera TODAS as notificacoes (nao apenas as vinculadas a operacoes). Se houver notificacoes que nao sao de operacoes e precisam ser mantidas, isso precisa ser discutido antes.
- **Irreversibilidade:** Esta acao nao pode ser desfeita. Todos os dados serao permanentemente removidos.

