

# Analise: Comportamento de /operations com 216.000 Operacoes

## O que ja funciona bem

| Componente | Status | Motivo |
|-----------|--------|--------|
| OperationImport.tsx | OK | Importacao resiliente com batch de 100, delay 150ms, retry com backoff. ~5-6 min para 216k |
| OperationsTable.tsx | OK | Ja usa `.limit(100)` ou `.limit(10)` - nunca carrega tudo |
| AIInsightsCard.tsx | OK | Ja envia dados pre-agregados (resumo estatistico), nao os 216k registros brutos |
| PerformanceCalendar.tsx | OK | Ja tem guard para > 50.000 operacoes (mostra aviso) |
| AdvancedMetrics.tsx | OK | Ja tem guard para > 50.000 operacoes (mostra aviso) |
| PerformanceHeatmap.tsx | OK | Ja tem guard para > 50.000 operacoes (mostra aviso) |

## Problemas identificados

### 1. CRITICO: Fetch carrega TUDO em memoria (OperationsDashboard.tsx)

O `loadOperations()` usa paginacao em batches de 1.000, mas carrega **todas as 216k operacoes na memoria do browser**.

```text
Impacto:
- 216 requisicoes sequenciais (216k / 1000)
- ~200-500MB de RAM ocupada
- Tempo de carregamento: 30-60 segundos
- Browser pode ficar lento ou crashar em dispositivos com pouca RAM
```

Porem, como o dashboard so mostra estrategias da whitelist (Alaska & Square, Apollo, Ares, Orion), muitas dessas 216k operacoes podem ser descartadas. O filtro acontece DEPOIS do fetch, desperdicando banda e memoria.

**Solucao:** Adicionar filtro `.in('strategy', allowedStrategies)` na query para buscar APENAS operacoes das 4 estrategias permitidas. Isso pode reduzir drasticamente o volume (ex: de 216k para 20-50k).

### 2. MEDIO: calculateStats itera 216k sem otimizacao

A funcao `calculateStats` usa multiplos `filter()`, `reduce()` e `Math.max(...array)` sobre o array completo. Com 216k operacoes (mesmo filtradas pela whitelist):

```text
- ops.filter(positive) -> itera 216k
- ops.filter(negative) -> itera 216k  
- ops.reduce(total) -> itera 216k
- Math.max(...ops.map()) -> cria array de 216k e spread operator
- Math.min(...ops.map()) -> mesmo problema
- Total: ~7 passagens sobre 216k = ~1.5 milhoes de iteracoes
```

`Math.max(...array)` com 216k items pode causar **stack overflow** (RangeError: Maximum call stack size exceeded).

**Solucao:** Refatorar para single-pass (uma unica iteracao calcula tudo).

### 3. MEDIO: generateCharts itera 216k multiplas vezes

A funcao `generateCharts` faz 4 `reduce()` separados sobre o dataset completo:
- dailyResults (curva de equity)
- monthData (estatisticas mensais)  
- hourDistData (distribuicao por hora)
- yearlyData (estatisticas anuais)

**Solucao:** Consolidar em um unico loop que calcula todas as agregacoes simultaneamente.

### 4. MEDIO: StrategyOptimizer itera operacoes nao-filtradas

O `StrategyOptimizer` recebe `operations` (todas as operacoes, nao filtradas). Para cada estrategia, chama `calculateBestConfig` que faz `operations.filter(op => op.strategy === strategy)` e depois 3 loops separados (por hora, dia, mes).

Com 216k operacoes e 4 estrategias: ~4 x 4 loops = 16 iteracoes sobre 216k.

**Solucao:** Pre-filtrar e usar single-pass por estrategia.

### 5. BAIXO: strategyStats em generateCharts acumula arrays

No calculo de `strategyData`, cada operacao e empurrada para `acc[strategy].operations.push(op)` e `acc[strategy].results.push(result)`. Com 216k operacoes, isso duplica o uso de memoria (arrays originais + arrays por estrategia).

**Solucao:** Calcular drawdown incrementalmente sem armazenar todos os resultados.

---

## Plano de Otimizacao

### Fase 1: Filtrar na query (maior impacto)

**Arquivo: `src/components/operations/OperationsDashboard.tsx`**

Adicionar filtro de estrategia na query do banco para buscar apenas operacoes das estrategias permitidas:

```typescript
// ANTES: busca TUDO
const { data, error } = await supabase
  .from("trading_operations")
  .select("operation_date, operation_time, result, strategy")
  .order("operation_date", { ascending: true })
  .range(from, from + batchSize - 1);

// DEPOIS: busca apenas estrategias permitidas
const allowedStrategies = ['Alaska & Square', 'Apollo', 'Ares', 'Orion'];
const { data, error } = await supabase
  .from("trading_operations")
  .select("operation_date, operation_time, result, strategy")
  .in("strategy", allowedStrategies)
  .order("operation_date", { ascending: true })
  .range(from, from + batchSize - 1);
```

Isso pode reduzir o volume de 216k para possivelmente 20-50k (dependendo da distribuicao de estrategias).

### Fase 2: Single-pass em calculateStats

**Arquivo: `src/components/operations/OperationsDashboard.tsx`**

Refatorar `calculateStats` para calcular tudo em uma unica passagem, eliminando o risco de stack overflow com `Math.max(...array)`:

```typescript
// ANTES: 7+ passagens sobre o array
const positiveOps = ops.filter(op => op.result > 0);  // passagem 1
const negativeOps = ops.filter(op => op.result < 0);   // passagem 2
const totalResult = ops.reduce(...);                    // passagem 3
Math.max(...ops.map(op => op.result));                 // passagem 4+5 (STACK OVERFLOW!)

// DEPOIS: 1 passagem
let totalResult = 0, bestResult = -Infinity, worstResult = Infinity;
let winCount = 0, winSum = 0, lossCount = 0, lossSum = 0;
const dailyResults: Record<string, number> = {};
const monthlyResults: Record<string, number> = {};

ops.forEach(op => {
  const result = op.result;
  totalResult += result;
  if (result > bestResult) bestResult = result;
  if (result < worstResult) worstResult = result;
  if (result > 0) { winCount++; winSum += result; }
  else if (result < 0) { lossCount++; lossSum += Math.abs(result); }
  // ... daily e monthly na mesma passagem
});
```

### Fase 3: Single-pass em generateCharts

**Arquivo: `src/components/operations/OperationsDashboard.tsx`**

Consolidar os 4 `reduce()` separados em 1 unico loop:

```typescript
// Um unico loop calcula: daily, monthly, hourly e yearly
const daily: Record<string, number> = {};
const monthly: Record<string, number> = {};
const hourly: Record<number, {...}> = {};
const yearly: Record<string, number> = {};

ops.forEach(op => {
  const result = op.result;
  // Daily
  daily[op.operation_date] = (daily[op.operation_date] || 0) + result;
  // Monthly
  const monthKey = op.operation_date.substring(0, 7);
  monthly[monthKey] = (monthly[monthKey] || 0) + result;
  // Hourly
  const hour = parseInt(op.operation_time.split(":")[0]);
  // ... etc
  // Yearly
  const year = op.operation_date.substring(0, 4);
  yearly[year] = (yearly[year] || 0) + result;
});
```

### Fase 4: Otimizar strategyStats (memoria)

**Arquivo: `src/components/operations/OperationsDashboard.tsx`**

Calcular drawdown incrementalmente sem armazenar arrays:

```typescript
// ANTES: armazena todos os resultados em arrays
acc[strategy].operations.push(op);     // duplica memoria
acc[strategy].results.push(result);    // duplica memoria

// DEPOIS: calcula drawdown on-the-fly
if (!acc[strategy]) {
  acc[strategy] = { 
    totalOps: 0, totalResult: 0, wins: 0, losses: 0,
    totalWinAmount: 0, totalLossAmount: 0,
    accumulated: 0, peak: 0, maxDrawdown: 0 
  };
}
acc[strategy].accumulated += result;
if (acc[strategy].accumulated > acc[strategy].peak) {
  acc[strategy].peak = acc[strategy].accumulated;
}
const drawdown = acc[strategy].peak - acc[strategy].accumulated;
if (drawdown > acc[strategy].maxDrawdown) {
  acc[strategy].maxDrawdown = drawdown;
}
```

---

## Resumo de Arquivos a Modificar

| Arquivo | Mudanca | Prioridade |
|---------|---------|------------|
| `src/components/operations/OperationsDashboard.tsx` | Query filtrada + single-pass stats + single-pass charts + memoria otimizada | CRITICA |

---

## Estimativas com 216k

| Metrica | Antes | Depois |
|---------|-------|--------|
| Operacoes buscadas do banco | 216.000 | ~20-50k (apenas whitelist) |
| Requisicoes de fetch | ~216 batches | ~20-50 batches |
| Passagens sobre o array (stats) | 7+ | 1 |
| Passagens sobre o array (charts) | 4 | 1 |
| Risco de stack overflow | SIM (Math.max spread) | NAO |
| Uso de memoria (strategy) | ~2x (arrays duplicados) | ~1x (incremental) |
| Tempo de carregamento | 30-60s | ~5-10s |
| Guards nos componentes filhos | Ja implementados | Ja implementados |

