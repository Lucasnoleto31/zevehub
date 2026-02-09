

# Recriar MarginAnalysis com Stop/Gain Ideal (+40% seguranca) + Corrigir Build Error

## Resumo

Dois itens de trabalho:
1. Recriar o componente `MarginAnalysis.tsx` (foi deletado anteriormente) com Stop/Gain Ideal por hora, ja incluindo a margem de seguranca de +40% no Stop desde o inicio
2. Corrigir o erro de build no `TradingDashboard.tsx` (RPC `get_trading_dashboard` inexistente)

---

## 1. Novo arquivo: `src/components/operations/MarginAnalysis.tsx`

### Logica de calculo (useMemo)

Recebe `filteredOperations` como prop. Dois agrupamentos:

**Mapa de contratos** (para margem):
- `dateHourContractMap[data][hora] = max(contratos)`
- Para cada hora: margem media, margem pico

**Mapa de resultados** (para stop/gain):
- `dateHourResultMap[data][hora] += resultado`
- Para cada hora h (9-17):
  - Dias positivos: dias onde soma > 0 -> `avgGain = media`
  - Dias negativos: dias onde soma < 0 -> `avgStop = |media| * 1.4` (com margem de seguranca)
  - `winDays`, `lossDays`, `payoff = avgGain / avgStop`

### Constante de seguranca

```text
STOP_SAFETY_MARGIN = 1.4  // +40%
```

### Cards resumo (5 cards)

| Card | Valor | Cor | Sublabel |
|------|-------|-----|----------|
| Margem Media | media geral | cyan | Margem media por hora |
| Margem Pico | maximo geral | amber | Maior pico registrado |
| Total Horas | horas com dados | violet | Janelas analisadas |
| Stop Ideal | media geral stops | red | Media + 40% margem de seguranca |
| Gain Ideal | media geral gains | emerald | Media dos resultados positivos |

Grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`

### Grafico 1: Margem por hora
- BarChart com barras para margem media e linha para margem pico
- Tooltip customizado incluindo gain ideal, stop ideal, dias positivos/negativos

### Grafico 2: Stop vs Gain por hora
- BarChart com barras agrupadas (verde = gain, vermelho = stop)
- Altura compacta (~220px)
- Titulo: "Stop e Gain Ideal por Hora"
- Subtitulo: "Baseado no resultado medio acumulado por janela (stop com +40% de seguranca)"
- Tooltip com payoff ratio

### Legenda
- Margem Media, Margem Pico, Gain Ideal, Stop Ideal

---

## 2. Integracao no OperationsDashboard.tsx

Importar e renderizar `MarginAnalysis` apos `RobosCharts` e antes de `AdvancedMetrics`:

```text
RobosCharts
MarginAnalysis       <-- NOVO
AdvancedMetrics
PerformanceCalendar
Heatmap + TopDays
```

---

## 3. Correcao do build error: TradingDashboard.tsx

Remover toda a logica de RPC inexistente:
- Remover `interface RPCDashboardData` (linhas 77-94)
- Remover estados `rpcData`, `rpcLoading` (linhas 410-411)
- Remover funcao `fetchRPCData` e seu useEffect (linhas 413-456)
- Remover o bloco de loading baseado em `rpcLoading` (linhas 995-1004)
- Remover a condicao `userId && !rpcData` do empty state (linha 1006)
- No `useMemo` de `stats`, remover o caminho RPC (`if (rpcData && userId)`) e manter apenas o calculo local baseado em `filteredOperations`

O componente ja recebe `operations` como prop e calcula tudo localmente -- o RPC era redundante e causa o erro de build.

---

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/operations/MarginAnalysis.tsx` | **Criar** |
| `src/components/operations/OperationsDashboard.tsx` | Importar MarginAnalysis + renderizar |
| `src/components/trading/TradingDashboard.tsx` | Remover RPC inexistente |

