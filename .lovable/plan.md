

# Adicionar Stop Ideal e Gain Ideal por Hora

## Resumo
Expandir o componente `MarginAnalysis` para incluir, alem da margem necessaria, o **Stop Ideal** e o **Gain Ideal** por janela de horario, calculados a partir do historico real de operacoes.

## Logica de calculo

Para cada hora (9h-17h), com base nas operacoes filtradas:

```text
Stop Ideal (por hora) = media dos resultados negativos naquela janela
  -> Ex: se as 10h as perdas foram -50, -30, -70 => Stop Ideal = R$ -50,00

Gain Ideal (por hora) = media dos resultados positivos naquela janela
  -> Ex: se as 10h os ganhos foram +80, +60, +100 => Gain Ideal = R$ +80,00
```

Isso mostra, por hora, qual o stop e o gain tipicos baseados no comportamento real do trader.

## O que sera modificado

### Arquivo: `src/components/operations/MarginAnalysis.tsx`

#### 1. Expandir o calculo no `useMemo`

Adicionar ao agrupamento por hora:
- `totalLosses`: soma das perdas naquela hora
- `lossCount`: quantidade de operacoes negativas naquela hora
- `totalWins`: soma dos ganhos naquela hora
- `winCount`: quantidade de operacoes positivas naquela hora

E nos dados finais por hora:
- `avgStop`: media dos resultados negativos (stop ideal)
- `avgGain`: media dos resultados positivos (gain ideal)
- `payoff`: razao gain/stop (quanto ganha para cada real que perde)

#### 2. Adicionar 2 novos cards resumo (total: 5 cards)

Os 3 cards atuais permanecem. Serao adicionados:

| Card | Valor | Cor |
|------|-------|-----|
| Stop Ideal (geral) | Media dos stops de todas as horas | Vermelho (red-400) |
| Gain Ideal (geral) | Media dos gains de todas as horas | Verde (emerald-400) |

O grid passara de 3 para 5 colunas (em telas grandes) ou 2-3 colunas em telas menores.

#### 3. Expandir o grafico de barras

Adicionar ao grafico existente:
- Uma segunda barra (agrupada) ou indicadores visuais para stop/gain por hora
- Alternativa mais limpa: manter o grafico de margem como esta e adicionar um **segundo grafico menor** abaixo mostrando stop vs gain por hora lado a lado (barras vermelhas para stop, verdes para gain)

**Abordagem escolhida**: Adicionar um segundo grafico compacto de barras agrupadas (stop vs gain) logo abaixo do grafico de margem, mantendo a separacao visual clara.

#### 4. Expandir o tooltip

Adicionar ao tooltip existente:
- Stop Ideal (R$) -- em vermelho
- Gain Ideal (R$) -- em verde
- Payoff daquela hora (razao gain/stop)

#### 5. Atualizar a legenda

Adicionar indicadores para:
- Barra vermelha = Stop Medio
- Barra verde = Gain Medio

## Detalhes tecnicos

### Novas constantes no calculo por hora

```text
Para cada hora h:
  avgStop = totalLosses[h] / lossCount[h]   (valor negativo)
  avgGain = totalWins[h] / winCount[h]       (valor positivo)
  payoff  = avgGain / |avgStop|              (razao)
```

### Novos campos no summaryStats

```text
overallAvgStop  = media dos avgStop de todas as horas com dados
overallAvgGain  = media dos avgGain de todas as horas com dados
overallPayoff   = overallAvgGain / |overallAvgStop|
```

### Layout do segundo grafico (Stop vs Gain)

```text
[Barra vermelha (Stop)] [Barra verde (Gain)]  -- por hora
   9h   10h   11h   12h   13h   14h   15h   16h   17h
```

- Altura: ~220px (mais compacto que o grafico principal de 320px)
- Barras agrupadas lado a lado
- Gradiente vermelho para stop, gradiente verde para gain

### Arquivo modificado
- `src/components/operations/MarginAnalysis.tsx` -- unico arquivo alterado

### Nenhum arquivo novo necessario
Toda a logica sera adicionada dentro do componente existente.

