

# Plano: Corrigir Timeout com Índice + Batch Menor

## Problema Raiz Identificado

1. **Falta de índice na coluna `strategy`** - Cada SELECT/DELETE faz full table scan
2. **ON DELETE CASCADE** em `ai_classification_logs` e `notifications` - Cada delete pode remover centenas de registros relacionados
3. **REPLICA IDENTITY FULL** - Overhead adicional no WAL para cada delete

## Solução em 2 Partes

### Parte 1: Criar Índice (Migração SQL)

```sql
CREATE INDEX idx_trading_operations_strategy 
ON public.trading_operations (strategy);
```

Isso vai acelerar drasticamente todas as consultas que filtram por estratégia.

### Parte 2: Reduzir Batch Size (Código)

Arquivo: `src/components/operations/DeleteOperationsByStrategy.tsx`

Mudanças:
- Reduzir `BATCH_SIZE` de 25 para **5** registros
- Aumentar delay entre batches de 200ms para **500ms**
- Adicionar tratamento de erro com retry

```text
┌─────────────────────────────────────────┐
│  BATCH_SIZE = 5 (era 25)                │
├─────────────────────────────────────────┤
│  DELAY = 500ms (era 200ms)              │
├─────────────────────────────────────────┤
│  Retry automático em caso de erro       │
└─────────────────────────────────────────┘
```

Código atualizado:

```typescript
const deleteBatch = async (strategy: string): Promise<number> => {
  const BATCH_SIZE = 5; // Reduzido de 25 para 5
  const MAX_RETRIES = 3;
  let totalDeleted = 0;

  while (true) {
    const { data: operations, error: fetchError } = await supabase
      .from("trading_operations")
      .select("id")
      .eq("strategy", strategy)
      .limit(BATCH_SIZE);

    if (fetchError) throw fetchError;
    if (!operations || operations.length === 0) break;

    const ids = operations.map(op => op.id);
    let retries = 0;
    let success = false;

    while (retries < MAX_RETRIES && !success) {
      const { error } = await supabase
        .from("trading_operations")
        .delete()
        .in("id", ids);

      if (!error) {
        success = true;
      } else if (error.message.includes("timeout")) {
        retries++;
        await new Promise(r => setTimeout(r, 1000 * retries));
      } else {
        throw error;
      }
    }

    if (!success) throw new Error("Falha após múltiplas tentativas");

    totalDeleted += ids.length;
    setDeletedCount(totalDeleted);
    
    if (totalCount > 0) {
      setProgress(Math.min(Math.round((totalDeleted / totalCount) * 100), 99));
    }

    // Delay maior entre lotes
    await new Promise(r => setTimeout(r, 500));
  }

  setProgress(100);
  return totalDeleted;
};
```

## Ordem de Execução

1. Criar o índice via migração SQL
2. Atualizar o código com batch menor e retry
3. Testar a exclusão das operações Apollo

## Tempo Estimado

Com batch de 5 e 500ms de delay:
- 1980 operações ÷ 5 = 396 lotes
- 396 × 0.5s = ~3-4 minutos

Após criar o índice, o tempo pode reduzir para ~1-2 minutos.

