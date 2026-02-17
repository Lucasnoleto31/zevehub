
# Novas Metricas Avancadas + Tabela Desempenho Mensal por Ano

## Resumo

Adicionar 6 novas metricas avancadas ao componente `AdvancedMetrics.tsx` (totalizando 15 metricas) e criar um novo componente de tabela "Desempenho Mensal por Ano (%)" no estilo da imagem de referencia.

---

## 1. Novas 6 Metricas Avancadas

Adicionar ao `AdvancedMetrics.tsx` as seguintes metricas (as 6 mais relevantes das 10 propostas):

### 1.1 - Sortino Ratio
- **Formula**: Retorno medio / Desvio padrao apenas dos retornos negativos
- **Descricao**: Penaliza apenas volatilidade negativa (mais justo que Sharpe)
- **Cor**: Emerald se > 1, Rose se < 1

### 1.2 - Kelly Criterion (%)
- **Formula**: WinRate - ((1 - WinRate) / Payoff)
- **Descricao**: Percentual otimo de capital a arriscar por operacao
- **Cor**: Emerald se entre 5-25%, Amber se > 25% ou < 5%, Rose se negativo

### 1.3 - Risk of Ruin (%)
- **Formula**: ((1 - Edge) / (1 + Edge))^Units, onde Edge = (WinRate * Payoff) - (1 - WinRate)
- **Descricao**: Probabilidade estatistica de perder todo o capital
- **Cor**: Emerald se < 1%, Amber se 1-10%, Rose se > 10%

### 1.4 - Win/Loss Streak Max
- **Formula**: Contagem da maior sequencia consecutiva de dias positivos e negativos
- **Valor exibido**: "+X / -Y dias"
- **Cor**: Emerald se streak positiva > negativa, Rose se contrario

### 1.5 - Coefficient of Variation
- **Formula**: (Desvio padrao / Media dos retornos diarios) * 100
- **Descricao**: Mede a estabilidade/previsibilidade dos resultados
- **Cor**: Emerald se < 100%, Amber se 100-200%, Rose se > 200%

### 1.6 - Exposure Ratio
- **Formula**: Dias com operacoes / Total de dias uteis no periodo
- **Descricao**: Percentual de dias em que houve operacao ativa
- **Cor**: Emerald se > 80%, Amber se 50-80%, Rose se < 50%

---

## 2. Tabela Desempenho Mensal por Ano (%)

Novo componente `MonthlyPerformanceTable.tsx` que exibe uma tabela matricial como na imagem de referencia.

### Layout
- **Colunas**: ANO | JAN | FEV | MAR | ABR | MAI | JUN | JUL | AGO | SET | OUT | NOV | DEZ | ACUMULADO
- **Linhas**: Uma por ano (ex: 2021 a 2026), ordenadas do mais recente para o mais antigo
- **Valores**: Percentual de retorno mensal calculado como: resultado do mes / capital acumulado no inicio do mes * 100
- **Cores**: Valores positivos em azul/verde, negativos em vermelho/rosa
- **Coluna ACUMULADO**: Retorno acumulado do ano inteiro (composicao dos retornos mensais)
- Meses sem operacao exibem "0%"

### Calculo do retorno %
Como nao temos um capital base definido, o calculo sera baseado no resultado absoluto do primeiro mes como referencia. O retorno de cada mes sera calculado como percentual relativo ao acumulado ate aquele ponto:
- Mes 1: resultado do mes como base
- Demais: resultado do mes / max(acumulado ate mes anterior, 1) * 100

Alternativa mais simples e direta: usar o resultado total do primeiro dia como base de R$10.000 (capital ficticio padrao) e calcular os retornos % sobre esse capital evoluindo.

### Design
- Card premium com titulo "Desempenho Mensal por Ano (%)" e icone de grafico
- Tabela com header azul/primario (fundo colorido como na imagem)
- Linhas alternadas com hover effect
- Scroll horizontal em mobile
- Coluna ACUMULADO com destaque (bold, fundo levemente colorido)
- Valores formatados com 2 casas decimais + sinal %

---

## Detalhes Tecnicos

### Arquivos modificados
- `src/components/dashboard/AdvancedMetrics.tsx`
  - Adicionar 6 novos campos na interface `Metrics` e `HistoricalMetrics`
  - Adicionar calculos no `calculateMetrics`
  - Adicionar 6 novos `MetricCard` no `renderMetricsForStrategy` (grid 3x5)
  - Importar novos icones do lucide-react

### Arquivos criados
- `src/components/operations/MonthlyPerformanceTable.tsx` - componente da tabela matricial

### Arquivo de integracao
- `src/components/operations/OperationsDashboard.tsx` - importar e posicionar `MonthlyPerformanceTable` apos `RobosCharts` e antes de `MarginAnalysis`

### Posicionamento no Dashboard

```text
RobosHero
RobosFilters
RobosQuickStats
RobosCharts
--> MonthlyPerformanceTable (NOVO)
MarginAnalysis
AdvancedMetrics (com 15 metricas)
PerformanceCalendar
Heatmap + TopDays
```

### Props
- `MonthlyPerformanceTable` recebe `filteredOperations` (mesmo padrao)
- Capital base ficticio de R$10.000 para calculo de % (ou parametrizavel via prop opcional)
