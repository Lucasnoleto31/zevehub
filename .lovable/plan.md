

# Evolucao Comparativa + Tabela Mensal por Estrategia

## Resumo

Criar 2 novos componentes para o dashboard `/operations` e corrigir o erro de build do `TradingDashboard.tsx`.

---

## 1. StrategyEvolution.tsx (novo componente)

Grafico multi-linha mostrando a curva de equity acumulada de CADA estrategia separadamente, no mesmo grafico.

### Dados
- Recebe `filteredOperations` como prop
- Agrupa operacoes por `(operation_date, strategy)`
- Para cada estrategia, acumula resultado dia a dia
- Gera array de pontos: `{ date, Alaska: 1200, Apollo: 800, Ares: 500, Orion: 1500 }`

### Visual
- `AreaChart` com uma `Area` por estrategia (4 cores distintas)
- Gradientes preenchidos com opacidade baixa
- Legenda interativa
- Tooltip premium mostrando o acumulado de cada estrategia na data
- Card com icone `TrendingUp`, borda cyan
- Altura do grafico: 350px

### Cores por estrategia
- Alaska & Square: cyan-400
- Apollo: amber-400
- Ares: violet-400
- Orion: emerald-400

---

## 2. MonthlyStrategyTable.tsx (novo componente)

Tabela/matriz mostrando resultado de cada estrategia em cada mes.

### Dados
- Recebe `filteredOperations` como prop
- Agrupa por `(strategy, YYYY-MM)`
- Gera estrutura: `{ strategy, Jan, Fev, Mar, ..., Dez, total }`
- Linha final com TOTAL por mes

### Visual
- Tabela usando componentes `Table/TableHead/TableRow/TableCell`
- Valores coloridos: verde (positivo), vermelho (negativo)
- Celulas com hover mostrando tooltip (qtde operacoes, win rate)
- Linha de total com fundo diferenciado
- Coluna final com total por estrategia
- Card com icone `Calendar`, borda violet
- Scroll horizontal em mobile

---

## 3. Correcao do build error em TradingDashboard.tsx

O erro referencia `supabase.rpc('get_trading_dashboard')` que nao existe. A solucao e remover toda a logica de RPC (`fetchRPCData`, `rpcData`, `rpcLoading`) e a interface `RPCDashboardData`, ja que o componente ja recebe `operations` como prop e calcula tudo localmente.

---

## 4. Integracao no OperationsDashboard.tsx

Adicionar os 2 novos componentes no JSX, apos `RobosCharts` e antes de `AdvancedMetrics`:

```text
RobosCharts
RobosStrategyCards       <-- REATIVADO
StrategyEvolution        <-- NOVO
MonthlyStrategyTable     <-- NOVO
AdvancedMetrics
PerformanceCalendar
Heatmap + TopDays
```

Tambem reativar `RobosStrategyCards` passando `strategyStats` e `filteredOperations`.

---

## Detalhes tecnicos

### Arquivos criados
| Arquivo | Descricao |
|---------|-----------|
| `src/components/operations/StrategyEvolution.tsx` | Curvas de equity comparativas |
| `src/components/operations/MonthlyStrategyTable.tsx` | Tabela mes x estrategia |

### Arquivos modificados
| Arquivo | Alteracao |
|---------|-----------|
| `src/components/operations/OperationsDashboard.tsx` | Importar e renderizar novos componentes + reativar StrategyCards |
| `src/components/trading/TradingDashboard.tsx` | Remover RPC inexistente para corrigir build error |

### Props dos novos componentes

```text
StrategyEvolution:
  - filteredOperations: Operation[]

MonthlyStrategyTable:
  - filteredOperations: Operation[]
```

### Dependencias
- Recharts (ja instalado) para StrategyEvolution
- Table components de `@/components/ui/table` para MonthlyStrategyTable
- Framer Motion (ja instalado) para animacoes

### Logica do StrategyEvolution

```text
1. Agrupar ops por (date, strategy) -> dailyByStrategy[date][strategy] += result
2. Ordenar datas cronologicamente
3. Para cada data, acumular resultado por estrategia
4. Gerar array: [{ date: "01/01", "Alaska & Square": 1200, "Apollo": 800, ... }]
5. Renderizar AreaChart com Area por estrategia
```

### Logica do MonthlyStrategyTable

```text
1. Extrair meses unicos (YYYY-MM) das operacoes
2. Para cada (strategy, month): somar resultado e contar ops
3. Gerar linhas da tabela: uma por estrategia + linha TOTAL
4. Colunas: Estrategia | Meses encontrados | Total
5. Celulas coloridas por valor positivo/negativo
```

