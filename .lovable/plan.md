

# Plano: Implementar Exclusão em Lotes para Evitar Timeout

## Problema Identificado

A exclusão de ~1.991 operações do Apollo está falhando por **timeout** do banco de dados. Uma única operação DELETE com muitos registros excede o limite de tempo permitido.

## Solução

Modificar o componente `DeleteOperationsByStrategy` para excluir operações **em lotes menores** (100-200 por vez), garantindo que cada operação complete antes do timeout.

---

## Alterações Técnicas

### Arquivo: `src/components/operations/DeleteOperationsByStrategy.tsx`

**Mudanças:**
1. Implementar função de exclusão em lotes
2. Adicionar indicador de progresso durante exclusão
3. Excluir 100 registros por vez até completar

**Nova lógica de exclusão:**

```text
┌─────────────────────────────────────────┐
│  1. Buscar IDs das operações a excluir  │
│     (SELECT id WHERE strategy = X)      │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  2. Dividir em lotes de 100 IDs         │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  3. Para cada lote:                     │
│     - DELETE WHERE id IN (lote)         │
│     - Atualizar progresso na UI         │
│     - Aguardar pequeno delay            │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  4. Exibir sucesso ao finalizar         │
└─────────────────────────────────────────┘
```

**Código da função de exclusão em lotes:**

```typescript
const deleteBatch = async (strategy: string) => {
  const BATCH_SIZE = 100;
  let totalDeleted = 0;
  
  // Buscar todos os IDs da estratégia
  const { data: operations, error: fetchError } = await supabase
    .from("trading_operations")
    .select("id")
    .eq("strategy", strategy);
  
  if (fetchError) throw fetchError;
  if (!operations?.length) return 0;
  
  const totalToDelete = operations.length;
  const ids = operations.map(op => op.id);
  
  // Excluir em lotes
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    
    const { error } = await supabase
      .from("trading_operations")
      .delete()
      .in("id", batch);
    
    if (error) throw error;
    
    totalDeleted += batch.length;
    setProgress(Math.round((totalDeleted / totalToDelete) * 100));
    
    // Pequeno delay entre lotes
    await new Promise(r => setTimeout(r, 100));
  }
  
  return totalDeleted;
};
```

---

## Interface Atualizada

- Adicionar estado `progress` para mostrar % de exclusão
- Mostrar "Excluindo... 45%" durante o processo
- Barra de progresso visual opcional

---

## Benefícios

| Antes | Depois |
|-------|--------|
| Timeout com datasets grandes | Exclusão confiável de qualquer tamanho |
| Sem feedback de progresso | Indicador de % completado |
| Falha silenciosa | Mensagens claras de erro/sucesso |

