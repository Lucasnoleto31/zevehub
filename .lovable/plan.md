

# Curva de Performance por Estrategia (Equity Comparativo)

## Resumo

Criar um grafico de curva de equity (AreaChart) comparando a evolucao acumulada de cada estrategia ao longo do tempo, similar a imagem de referencia. Cada estrategia tera sua propria linha com cor distinta.

## Alteracoes

### Arquivo: `src/components/operations/MarginAnalysis.tsx`

### 1. Novo calculo no useMemo: equity acumulada por estrategia

Agrupar operacoes por `(strategy, date)`, somar resultados por dia, ordenar por data e calcular o acumulado progressivo para cada estrategia.

```text
Para cada operacao:
  strategyDateMap[strategy][date] += result

Para cada strategy:
  ordenar datas cronologicamente
  acumular resultado dia a dia

Formato final:
  { date: "01/01", "Alaska & Square": 5000, "Apollo": 3200, "Ares": -800, "Orion": 1500 }
```

### 2. Novo grafico: AreaChart com multiplas linhas

Inserido entre o grafico de Margem por Hora e o de Stop/Gain. Especificacoes:

- `AreaChart` com uma `<Area>` por estrategia presente nos dados
- Cada Area com cor da estrategia, fill com gradiente transparente, stroke com `strokeWidth={2}`
- `ReferenceLine` em y=0 (linha pontilhada)
- Tooltip premium (fundo `#0a0a1a`) listando o acumulado de cada estrategia naquela data, com valores coloridos (verde positivo, vermelho negativo)
- Header com icone TrendingUp, titulo "Curva de Performance" e subtitulo "Evolucao do resultado acumulado por estrategia"
- Valor total acumulado (soma de todas) exibido no canto superior direito em destaque
- Borda: `border-emerald-500/20`
- YAxis com formatacao em `k` (ex: R$80k)
- XAxis com datas no formato `dd/mm`
- Amostragem inteligente: se mais de 365 pontos, reduzir para ~365 para performance

### 3. Gradientes

Criar um gradiente para cada estrategia com opacidade baixa (0.15) para o fill das areas, mantendo as linhas solidas.

### Impacto
- Nenhuma alteracao nos cards ou graficos existentes
- Novo bloco de calculo dentro do mesmo useMemo
- Novo grafico visual inserido entre Margem por Hora e Stop/Gain

