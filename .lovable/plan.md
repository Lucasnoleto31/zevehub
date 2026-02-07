

# Plano: Suportar 216k Operacoes sem Travar o Dashboard

## Problema

Com 216k operacoes no banco, a query filtrada traz ~75k. Os componentes que mostram **melhores dias e horarios** (Heatmap, Calendario, Metricas Avancadas) estao **bloqueados por guards de 50k** que exibem apenas um aviso. Alem disso, o guard do AdvancedMetrics tem um bug critico: e codigo inalcancavel.

## Solucao

Remover os guards de 50k e confiar nas otimizacoes single-pass ja implementadas, que processam 75-216k operacoes sem problemas de memoria ou CPU.

---

## Mudancas por Arquivo

### 1. `src/components/dashboard/AdvancedMetrics.tsx`

**Bug critico**: O guard `isDatasetTooLarge` (linhas 552-574) esta posicionado **apos** a declaracao de `renderMetricsForStrategy`, tornando-o codigo morto. O componente nunca mostra o aviso quando ha dados.

- Remover a variavel `isDatasetTooLarge` e toda a logica de guard
- Remover a condicao `isDatasetTooLarge` de dentro de `calculateMetricsByStrategy()`
- Otimizar `calculateMetrics()` para usar single-pass (atualmente faz 5+ passes com filter/reduce)
- Remover import do `AlertTriangle`

### 2. `src/components/dashboard/PerformanceCalendar.tsx`

- Remover o guard que retorna aviso quando `operations.length > 50000` (linhas 41-48 no useMemo e linhas 202-224 no JSX)
- Remover import do `AlertTriangle`
- O `useMemo` ja processa eficientemente com Map/forEach, suporta 216k sem problemas

### 3. `src/components/dashboard/PerformanceHeatmap.tsx`

- Remover `isDatasetTooLarge` e o guard de 50k (linhas 50, 141, 242-265)
- Remover import do `AlertTriangle`
- Os `useMemo` e `useCallback` ja usam Map para processamento eficiente

### 4. `src/components/dashboard/TopPerformanceDays.tsx`

- Sem mudancas necessarias. Ja usa Map para agregar por dia e processa eficientemente.

### 5. `src/components/operations/StrategyOptimizer.tsx`

- Otimizar `calculateBestConfig()` para usar single-pass (atualmente faz `filter` + 3x `forEach` por estrategia)
- Consolidar em um unico loop que agrupa por hora, dia e mes simultaneamente

---

## Detalhes Tecnicos

### AdvancedMetrics - Otimizacao de `calculateMetrics()`

Codigo atual faz 5+ passes:
```text
ops.filter(r > 0).reduce(...)     // pass 1+2 (gains)
ops.filter(r < 0).reduce(...)     // pass 3+4 (losses)  
ops.filter(r > 0).length          // pass 5 (winCount)
ops.filter(r < 0).length          // pass 6 (lossCount)
ops.reduce(...)                   // pass 7 (totalProfit)
```

Refatorar para single-pass:
```text
ops.forEach(op => {
  totalProfit += op.result;
  if (op.result > 0) { winCount++; gains += op.result; }
  else if (op.result < 0) { lossCount++; lossSum += Math.abs(op.result); }
});
```

### StrategyOptimizer - Otimizacao de `calculateBestConfig()`

Codigo atual: `filter` por estrategia + 3 loops separados (hora, dia, mes)

Refatorar para: um unico loop por estrategia que popula os 3 buckets simultaneamente.

---

## Estimativa de Performance com 216k

| Componente | Antes | Depois |
|-----------|-------|--------|
| AdvancedMetrics | Bloqueado (guard 50k, mas bugado) | Funcional, single-pass |
| PerformanceCalendar | Bloqueado (guard 50k) | Funcional, Map-based |
| PerformanceHeatmap | Bloqueado (guard 50k) | Funcional, Map-based |
| TopPerformanceDays | Funcional | Sem mudanca |
| StrategyOptimizer | 16 passes (~1.2M iteracoes) | 4 passes single-pass (~300k iteracoes) |

Tempo de processamento estimado no browser com 75k operacoes (filtradas): menor que 500ms.
Tempo de processamento estimado com 216k operacoes (se whitelist for removida): menor que 2 segundos.

