
# Plano de Otimizacao para 216.000 Operacoes

## Diagnostico: O que vai travar?

### Problemas CRITICOS (vai travar/falhar)

| Componente | Problema | Impacto com 216k |
|-----------|---------|------------------|
| Trading.tsx (fetch) | `select('*')` sem paginacao, limite de 1000 rows | So carrega 1.000 das 216k operacoes |
| TradingDashboard.tsx | `useMemo` processa 216k no main thread | Congela a UI por 5-15 segundos |
| AIInsightsCard.tsx | Envia 216k operacoes inteiras no body da edge function | Estoura limite de payload (~50MB JSON) |
| Importacao (Trading.tsx) | 216k / 50 = 4.320 batches com 200ms delay | ~14 minutos de importacao |

### Problemas MEDIOS (lentidao)

| Componente | Problema | Impacto com 216k |
|-----------|---------|------------------|
| OperationsDashboard.tsx | Carrega 216k em memoria via paginacao | ~216 requisicoes de 1000, uso alto de RAM |
| PerformanceHeatmap.tsx | Itera 216k operacoes em useMemo | Lentidao ao renderizar |
| PerformanceCalendar.tsx | Itera 216k operacoes por mudanca de mes | Delay ao navegar meses |
| AdvancedMetrics.tsx | Calcula metricas sobre 216k registros | Lentidao moderada |

---

## Solucao Proposta

### Fase 1: Corrigir Fetch no /trading (CRITICO)

**Arquivo: `src/pages/Trading.tsx`**

O fetch atual usa `select('*')` sem paginacao, e o Supabase retorna no maximo 1000 rows por padrao. Com 216k operacoes, voce so veria 1.000.

Mudancas:
- Implementar paginacao em batches de 1000 (igual ao OperationsDashboard)
- Selecionar apenas colunas necessarias para reduzir payload
- Mostrar indicador de carregamento com progresso

```text
ANTES:
  supabase.from('profit_operations').select('*')
  -> Retorna apenas 1.000 registros (limite padrao)

DEPOIS:
  Loop paginado buscando 1.000 por vez
  -> Busca todos os 216.000 registros
  -> Seleciona apenas colunas necessarias
```

### Fase 2: Otimizar TradingDashboard (CRITICO)

**Arquivo: `src/components/trading/TradingDashboard.tsx`**

O `useMemo` que calcula `stats` processa todas as 216k operacoes sincronamente. Isso congela o browser.

Mudancas:
- Pre-agregar dados por dia ANTES dos calculos pesados (reduz 216k -> ~1.000 dias)
- O sampling de 365 pontos para graficos ja existe, manter
- Limitar ranking (bestDays/worstDays) que usa sort em 216k items

### Fase 3: Limitar AIInsightsCard (CRITICO)

**Arquivo: `src/components/dashboard/AIInsightsCard.tsx`**

Enviar 216k operacoes no body de uma edge function vai falhar. O payload seria ~50MB.

Mudancas:
- Pre-agregar dados no frontend antes de enviar
- Enviar apenas resumo estatistico (por hora, dia da semana, estrategia) em vez dos 216k registros brutos
- Limitar a no maximo 5.000 operacoes enviadas (amostragem se necessario)

### Fase 4: Otimizar Importacao

**Arquivo: `src/pages/Trading.tsx`**

216k / 50 = 4.320 batches. Com 200ms delay = ~14 minutos. Funcional mas lento.

Mudancas:
- Aumentar batch size para 100 registros (reduz para 2.160 batches)
- Reduzir delay para 150ms
- Tempo estimado: ~5-6 minutos (aceitavel com progress bar)

**Arquivo: `src/components/operations/OperationImport.tsx`**
- Mesmo ajuste: batch de 100 com delay de 150ms

### Fase 5: Otimizar Componentes Secundarios

**PerformanceHeatmap.tsx, PerformanceCalendar.tsx, AdvancedMetrics.tsx:**
- Estes componentes recebem `filteredOperations` que ja passa pelos filtros
- O impacto depende de quantos registros passam nos filtros
- Adicionar early-return se o dataset filtrado for > 50k (mostrar aviso para refinar filtros)

---

## Resumo de Arquivos a Modificar

| Arquivo | Mudanca | Prioridade |
|---------|---------|------------|
| `src/pages/Trading.tsx` | Fetch paginado + batch importacao 100 | CRITICA |
| `src/components/trading/TradingDashboard.tsx` | Pre-agregacao por dia | CRITICA |
| `src/components/dashboard/AIInsightsCard.tsx` | Limitar/agregar payload | CRITICA |
| `src/components/operations/OperationImport.tsx` | Batch 100, delay 150ms | MEDIA |
| `src/components/operations/OperationsDashboard.tsx` | Ja tem paginacao, manter | BAIXA |

---

## Estimativas com 216k

| Metrica | Antes | Depois |
|---------|-------|--------|
| Dados carregados no /trading | 1.000 (bug) | 216.000 (correto) |
| Tempo de carregamento | Rapido (incompleto) | ~20s (dados completos) |
| Responsividade da UI | Congela 5-15s | Fluida |
| Tempo de importacao | ~14 min | ~6 min |
| AI Insights | Falha (payload grande) | Funciona (dados agregados) |
| Uso de memoria | ~500MB+ | ~200MB (otimizado) |

---

## Detalhes Tecnicos

### Fetch Paginado (Trading.tsx)
```typescript
// Busca em batches de 1000 com select otimizado
let allOperations = [];
let from = 0;
const batchSize = 1000;
let hasMore = true;

while (hasMore) {
  const { data } = await supabase
    .from('profit_operations')
    .select('id, user_id, open_time, close_time, operation_result, strategy_id, asset')
    .eq('user_id', userId)
    .order('open_time', { ascending: false })
    .range(from, from + batchSize - 1);

  allOperations.push(...(data || []));
  from += batchSize;
  hasMore = (data?.length || 0) === batchSize;
}
```

### Pre-Agregacao (TradingDashboard.tsx)
```typescript
// Agregar por dia PRIMEIRO (216k -> ~1000 dias)
const dayResults = {};
operations.forEach(op => {
  const day = op.open_time.substring(0, 10);
  if (!dayResults[day]) dayResults[day] = { result: 0, count: 0, wins: 0, losses: 0 };
  const result = op.operation_result || 0;
  dayResults[day].result += result;
  dayResults[day].count++;
  // ... calculos sobre dados ja agregados
});
```

### AI Insights Otimizado
```typescript
// Enviar resumo agregado, nao 216k registros
const summary = {
  totalOps: operations.length,
  byHour: Object.entries(hourData).map(...),
  byWeekday: Object.entries(weekdayData).map(...),
  byStrategy: Object.entries(strategyData).map(...),
  recentOps: operations.slice(0, 500) // Amostra recente
};
await supabase.functions.invoke("analyze-trading-patterns", { body: summary });
```
