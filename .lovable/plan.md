

# Curva de Performance Trade-by-Trade (em vez de dia-a-dia)

## Problema

Atualmente, tanto no dashboard de Operacoes (`OperationsDashboard`) quanto no dashboard de Trading (`TradingDashboard`), a curva de equity agrupa os resultados por dia e acumula o total diario. O usuario quer que cada ponto do grafico represente uma operacao individual, com a soma acumulada trade a trade.

## Mudancas

### 1. `src/components/operations/OperationsDashboard.tsx` (linhas 510-519)

Substituir a logica de agrupamento por dia por uma iteracao trade-by-trade sobre `filteredOperations`, ordenadas por `operation_date` + `operation_time`:

```typescript
// Antes: agrupa por dia
let accumulated = 0;
const curve = Object.entries(daily)
  .sort(...)
  .map(([date, result]) => { accumulated += result; ... });

// Depois: trade-by-trade
const sorted = [...filteredOperations].sort((a, b) => {
  const cmp = a.operation_date.localeCompare(b.operation_date);
  return cmp !== 0 ? cmp : a.operation_time.localeCompare(b.operation_time);
});
let accumulated = 0;
const curve = sorted.map((op, i) => {
  accumulated += op.result;
  const [, mm, dd] = op.operation_date.split('-');
  return { date: `${dd}/${mm}`, value: Number(accumulated.toFixed(2)), index: i + 1 };
});
```

Manter o sampling de 365 pontos para performance.

### 2. `src/components/trading/TradingDashboard.tsx` (linhas 556-582)

Mesma logica: em vez de agrupar por dia, iterar sobre as operacoes ordenadas por `close_time` (que ja tem data+hora) e acumular trade a trade.

```typescript
// Antes: agrupa por dia
const sortedDays = Object.entries(dayResults).sort(...)

// Depois: trade-by-trade
const sortedOps = [...filteredOperations].sort((a, b) => 
  new Date(a.close_time).getTime() - new Date(b.close_time).getTime()
);
let cumulative = 0;
const fullEquityCurve = sortedOps.map((op, idx) => {
  cumulative += op.operation_result || 0;
  return {
    index: idx + 1,
    result: op.operation_result || 0,
    total: cumulative,
    date: format(new Date(op.close_time), 'dd/MM', { locale: ptBR })
  };
});
```

### 3. `src/components/dashboard/EquityCurveChart.tsx` e `BotsPerformanceChart.tsx`

Estes dois componentes nao sao importados em nenhum lugar do projeto (estao orfaos). Nao precisam ser alterados, mas se desejar consistencia, posso ajustar tambem.

## Resultado

Cada ponto da curva de performance representara um trade individual, mostrando a evolucao real do capital operacao a operacao.

