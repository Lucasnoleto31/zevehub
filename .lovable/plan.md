

# Plano: Corrigir Exclusão em Lotes com Paginação

## Problema Atual

O timeout está ocorrendo na consulta inicial `SELECT id FROM trading_operations WHERE strategy = 'Apollo'` que tenta buscar todos os 1.991 IDs de uma vez.

## Solução

Implementar **paginação completa** - buscar e excluir pequenos lotes iterativamente, sem nunca carregar todos os IDs na memória.

---

## Alterações Técnicas

### Arquivo: `src/components/operations/DeleteOperationsByStrategy.tsx`

**Nova lógica:**

```text
┌─────────────────────────────────────────┐
│  LOOP até não haver mais registros:     │
├─────────────────────────────────────────┤
│  1. SELECT id LIMIT 25                  │
│     (busca apenas 25 IDs por vez)       │
├─────────────────────────────────────────┤
│  2. Se não houver resultados, SAIR      │
├─────────────────────────────────────────┤
│  3. DELETE WHERE id IN (25 IDs)         │
├─────────────────────────────────────────┤
│  4. Atualizar contador de progresso     │
├─────────────────────────────────────────┤
│  5. Delay de 200ms entre lotes          │
└─────────────────────────────────────────┘
```

**Código corrigido:**

```typescript
const deleteBatch = async (strategy: string): Promise<number> => {
  const BATCH_SIZE = 25;
  let totalDeleted = 0;

  // Loop até não haver mais operações
  while (true) {
    // Buscar apenas BATCH_SIZE IDs por vez
    const { data: operations, error: fetchError } = await supabase
      .from("trading_operations")
      .select("id")
      .eq("strategy", strategy)
      .limit(BATCH_SIZE);

    if (fetchError) throw fetchError;
    
    // Se não há mais operações, terminar
    if (!operations || operations.length === 0) break;

    const ids = operations.map(op => op.id);

    // Excluir este lote
    const { error } = await supabase
      .from("trading_operations")
      .delete()
      .in("id", ids);

    if (error) throw error;

    totalDeleted += ids.length;
    setDeletedCount(totalDeleted);
    
    // Atualizar progresso (estimativa baseada no total inicial)
    if (totalCount > 0) {
      setProgress(Math.min(Math.round((totalDeleted / totalCount) * 100), 99));
    }

    // Delay entre lotes
    await new Promise(r => setTimeout(r, 200));
  }

  setProgress(100);
  return totalDeleted;
};
```

**Mudanças adicionais:**
- Buscar contagem total antes de iniciar (para barra de progresso)
- Usar `while(true)` com `break` quando não houver mais registros
- Cada iteração busca e exclui apenas 25 registros

---

## Benefícios

| Antes | Depois |
|-------|--------|
| SELECT de todos os IDs (timeout) | SELECT de 25 IDs por vez |
| Falha com datasets grandes | Funciona com qualquer tamanho |
| Progresso impreciso | Progresso em tempo real |

