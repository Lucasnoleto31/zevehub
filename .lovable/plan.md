

# Stop e Gain Ideal por Hora -- Baseado no Resultado Acumulado

## Conceito

Para cada janela de horario (9h-17h), agrupar as operacoes por dia e somar o resultado daquele dia naquela hora. Depois separar em dias positivos e negativos:

- **Gain Ideal** = media dos dias em que o resultado acumulado da hora foi positivo
- **Stop Ideal** = media dos dias em que o resultado acumulado da hora foi negativo

Exemplo pratico:
- As 9h, nos ultimos 30 dias operados:
  - 18 dias foram positivos, com media de +R$ 900
  - 12 dias foram negativos, com media de -R$ 400
  - Gain Ideal das 9h = R$ 900 | Stop Ideal das 9h = R$ 400

Isso mostra exatamente o comportamento real do trader em cada janela, definindo limites baseados no historico.

## O que sera modificado

### Arquivo: `src/components/operations/MarginAnalysis.tsx`

#### 1. Expandir o calculo no useMemo

Alem do agrupamento de contratos por (data, hora) que ja existe, adicionar um segundo agrupamento para resultados:

```text
Para cada operacao:
  dateHourResultMap[data][hora] += resultado

Depois, para cada hora:
  Dias positivos: filtrar dias onde dateHourResultMap[data][hora] > 0
  Dias negativos: filtrar dias onde dateHourResultMap[data][hora] < 0

  avgGain = media dos resultados positivos
  avgStop = media dos resultados negativos (valor absoluto)
  winDays = quantidade de dias positivos
  lossDays = quantidade de dias negativos
```

#### 2. Novos campos nos dados por hora

Cada item de `hourlyData` passara a incluir:

| Campo | Descricao |
|-------|-----------|
| `avgGain` | Media dos resultados positivos naquela hora |
| `avgStop` | Media dos resultados negativos (valor absoluto) |
| `winDays` | Qtde de dias positivos naquela hora |
| `lossDays` | Qtde de dias negativos naquela hora |

#### 3. Novos campos no summaryStats

| Campo | Descricao |
|-------|-----------|
| `overallAvgGain` | Media geral dos gains de todas as horas |
| `overallAvgStop` | Media geral dos stops de todas as horas |

#### 4. Adicionar 2 novos cards resumo (total: 5 cards)

Os 3 cards atuais permanecem. Novos cards:

| Card | Valor | Cor | Icone |
|------|-------|-----|-------|
| Stop Ideal | Media geral dos stops | Vermelho (red-400) | ShieldAlert ou OctagonX |
| Gain Ideal | Media geral dos gains | Verde (emerald-400) | Target ou TrendingUp |

O grid muda de `grid-cols-3` para `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` para acomodar os 5 cards.

#### 5. Segundo grafico: Stop vs Gain por hora

Um grafico de barras agrupadas abaixo do grafico de margem:

- **Barra verde** (gain ideal) e **barra vermelha** (stop ideal) lado a lado para cada hora
- Altura compacta (~220px)
- Titulo: "Stop e Gain Ideal por Hora"
- Subtitulo: "Baseado no resultado medio acumulado por janela"

Gradientes:
- Verde: emerald-400 para emerald-500
- Vermelho: red-400 para red-500

#### 6. Expandir o tooltip do grafico de margem

Adicionar ao tooltip existente (apos margem pico):
- Gain Ideal (R$) em verde
- Stop Ideal (R$) em vermelho
- Dias positivos vs negativos naquela hora

#### 7. Expandir a legenda

Adicionar ao final:
- Quadrado verde = Gain Ideal
- Quadrado vermelho = Stop Ideal

## Detalhes tecnicos

### Logica de calculo completa

```text
// Novo mapa: resultado acumulado por (data, hora)
dateHourResultMap: Record<string, Record<number, number>>

Para cada operacao:
  dateHourResultMap[data][hora] += resultado

Para cada hora h (9-17):
  gainDays = dias onde dateHourResultMap[*][h] > 0
  lossDays = dias onde dateHourResultMap[*][h] < 0

  avgGain = soma(gainDays) / gainDays.length
  avgStop = |soma(lossDays)| / lossDays.length  (valor absoluto)

Summary:
  overallAvgGain = media dos avgGain de horas com dados
  overallAvgStop = media dos avgStop de horas com dados
```

### Estrutura do segundo grafico

```text
BarChart (barras agrupadas)
  |-- Bar dataKey="avgGain" (verde)
  |-- Bar dataKey="avgStop" (vermelho)
  |-- XAxis: hora (9h-17h)
  |-- YAxis: R$ formatado
  |-- Tooltip customizado (StopGainTooltip)
```

### Arquivo modificado
- `src/components/operations/MarginAnalysis.tsx` -- unico arquivo alterado

### Nenhum arquivo novo necessario

