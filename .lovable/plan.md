

# Comparativo de Performance por Estrategia (com +40% no Stop)

## Resumo

Implementar o grafico comparativo de performance por estrategia ja aprovado, aplicando o multiplicador de +40% (STOP_SAFETY_MARGIN = 1.4) nos resultados negativos (stops) de cada estrategia por hora -- a mesma logica ja usada no grafico de Stop e Gain Ideal.

## Alteracoes

### Arquivo: `src/components/operations/MarginAnalysis.tsx`

### 1. Novo calculo no useMemo

Agrupar operacoes por `(strategy, date, hour)`, somar resultados por hora/dia, e calcular a media por hora para cada estrategia. Para resultados negativos (stop), multiplicar por 1.4 (+40% margem de seguranca).

```text
Para cada operacao:
  strategyDateHourMap[strategy][date][hour] += result

Para cada strategy, para cada hour (9-17):
  media = soma dos resultados / dias com operacao
  se media < 0: media = media * 1.4  (aplica +40%)
```

Retornar `strategyHourlyData` e `activeStrategies`.

### 2. Cores fixas por estrategia

```text
Alaska & Square -> #22d3ee (cyan)
Apollo          -> #a78bfa (violet)
Ares            -> #f97316 (orange)
Orion           -> #34d399 (emerald)
```

### 3. Novo grafico: LineChart comparativo

Inserido entre o grafico de Margem por Hora e o de Stop/Gain:

- `LineChart` com uma `<Line>` por estrategia presente nos dados
- `strokeWidth={2.5}`, dots com raio 4
- Tooltip premium (fundo `#0a0a1a`) com valores coloridos (verde positivo, vermelho negativo)
- Titulo: "Performance por Estrategia"
- Subtitulo: "Resultado medio por hora e estrategia (stops com +40% de seguranca)"
- Borda: `border-amber-500/20`

### 4. Imports e legenda

- Adicionar `LineChart` ao import do recharts
- Expandir legenda com as cores das estrategias

### Impacto
- Nenhuma alteracao nos cards ou graficos existentes
- Novo bloco de calculo dentro do mesmo useMemo
- Valores de stop por estrategia ficam 40% maiores (mais conservadores)

