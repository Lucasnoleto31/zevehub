
# Plano de Otimização para 40.000 Operações

## Objetivo
Otimizar o sistema de importação e dashboards para suportar 40 mil operações sem travar, implementando batching na página /trading e melhorias de performance nos gráficos.

---

## Problemas Identificados

### 1. Importação em /trading (CRÍTICO)
- **Arquivo**: `src/pages/Trading.tsx` (linhas 337-339)
- **Problema**: Insere todas as operações de uma única vez
- **Risco**: Timeout do banco e travamento com 40k registros

### 2. Dashboard de Trading
- **Arquivo**: `src/components/trading/TradingDashboard.tsx`
- **Problema**: Processa todas as operações na memória via `useMemo`
- **Risco**: UI lenta com grandes volumes

### 3. Dashboard de Robôs (/operations)
- **Arquivo**: `src/components/operations/OperationsDashboard.tsx`
- **Problema**: Carrega e processa todas as operações no frontend
- **Risco**: Consumo excessivo de memória

---

## Solução Proposta

### Fase 1: Batching na Importação do /trading

```text
┌──────────────────────────────────────────────────────┐
│             FLUXO DE IMPORTAÇÃO OTIMIZADO            │
├──────────────────────────────────────────────────────┤
│  1. Upload CSV                                       │
│         ↓                                            │
│  2. Parse das operações                              │
│         ↓                                            │
│  3. Divisão em batches de 50 registros               │
│         ↓                                            │
│  4. Inserção sequencial com delay de 100ms           │
│         ↓                                            │
│  5. Barra de progresso em tempo real                 │
│         ↓                                            │
│  6. Relatório de sucesso/falhas                      │
└──────────────────────────────────────────────────────┘
```

**Mudanças em `src/pages/Trading.tsx`:**
- Adicionar estados `importProgress` e `importErrors`
- Implementar função `batchInsert` com lotes de 50 registros
- Adicionar delay de 100ms entre batches
- Mostrar barra de progresso durante importação
- Tratamento de erros por lote

### Fase 2: Otimização do TradingDashboard

**Mudanças em `src/components/trading/TradingDashboard.tsx`:**
- Implementar **sampling inteligente** para gráficos quando houver mais de 5.000 operações
- Limitar equity curve a 365 pontos (agregação diária já existe)
- Adicionar `React.memo` nos componentes de chart
- Usar `useDeferredValue` para filtros

### Fase 3: Otimização do Dashboard de Robôs

**Mudanças em `src/components/operations/OperationsDashboard.tsx`:**
- Manter lógica atual de paginação no fetch (já implementada com batch de 1000)
- Adicionar sampling para gráficos com datasets grandes
- Limitar heatmap a dados agregados

---

## Detalhes Técnicos

### Batching na Importação (Trading.tsx)

Nova função `handleConfirmImport`:
```typescript
// Batch size otimizado para evitar timeouts
const BATCH_SIZE = 50;
const BATCH_DELAY = 100; // ms

// Inserção em lotes com progress tracking
for (let i = 0; i < batches; i++) {
  const batch = operationsWithUser.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
  await supabase.from('profit_operations').insert(batch);
  setImportProgress(((i + 1) / batches) * 100);
  await new Promise(r => setTimeout(r, BATCH_DELAY));
}
```

### Estimativa de Tempo de Importação
- 40.000 operações ÷ 50 por batch = 800 batches
- 800 batches × 100ms delay = 80 segundos (~1.5 min)
- Muito mais rápido que os 40+ minutos do batch atual de 10

### Sampling para Gráficos

```typescript
const sampleData = useMemo(() => {
  if (operations.length <= 5000) return operations;
  // Amostragem uniforme para manter representatividade
  const step = Math.ceil(operations.length / 5000);
  return operations.filter((_, i) => i % step === 0);
}, [operations]);
```

---

## Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/pages/Trading.tsx` | Adicionar batching, progress bar, tratamento de erros |
| `src/components/trading/TradingDashboard.tsx` | Adicionar sampling, otimizar memos |
| `src/components/operations/OperationsDashboard.tsx` | Adicionar sampling para gráficos |

---

## Benefícios Esperados

| Métrica | Antes | Depois |
|---------|-------|--------|
| Tempo importação 40k | Timeout/Falha | ~1.5 min |
| Uso de memória | Alto | Controlado |
| Responsividade UI | Travamentos | Fluida |
| Feedback ao usuário | Nenhum | Progress bar |

---

## Testes Recomendados

1. Importar arquivo com 1.000 operações (teste básico)
2. Importar arquivo com 10.000 operações (teste médio)
3. Importar arquivo com 40.000 operações (teste de stress)
4. Verificar gráficos com 40k dados carregados
5. Testar filtros com dataset grande
