

# Recriar Analise de Margem, Gain e Stop por Horario

## Resumo

Recriar o componente `MarginAnalysis` que mostra a analise de margem acumulada, ganho ideal e stop ideal por janela de horario, com o buffer de +40% de protecao no stop.

## Novo componente: MarginAnalysis.tsx

### Dados calculados (via useMemo a partir de filteredOperations)

Para cada hora do mercado (9h-18h):
- **Margem acumulada**: soma de todos os resultados naquela hora
- **Gain ideal**: media dos resultados positivos naquela hora
- **Stop ideal**: media do valor absoluto dos resultados negativos naquela hora **x 1.4** (buffer de 40%)

### Cards resumo (3 cards no topo)
1. **Margem Total** - soma de todas as margens por hora (icone DollarSign, borda emerald)
2. **Gain Ideal** - media geral dos gains por hora (icone TrendingUp, borda cyan)
3. **Stop Ideal** - media geral dos stops por hora com sublabel "Media + 40% margem de seguranca" (icone Shield, borda rose/red)

### Grafico de barras (BarChart)
- Eixo X: horas (9h, 10h, ..., 18h)
- 3 barras por hora:
  - Verde: Margem acumulada
  - Cyan: Gain ideal
  - Vermelho: Stop ideal (com buffer 40%)
- Tooltip premium com os 3 valores + quantidade de operacoes na hora
- Descricao do grafico mencionando que o stop inclui +40% de seguranca

### Constante
```text
STOP_SAFETY_MARGIN = 1.4
```

### Formula do Stop
```text
stopIdeal = Math.round(|media_perdas_hora| * 1.4)
```

## Integracao no OperationsDashboard.tsx

- Importar `MarginAnalysis`
- Adicionar `<MarginAnalysis filteredOperations={filteredOperations} />` apos `MonthlyStrategyTable` e antes de `AdvancedMetrics`

## Design visual

Segue o padrao premium do dashboard:
- Card com gradiente sutil e borda colorida
- Animacao de entrada com Framer Motion
- Cores semanticas (emerald=margem, cyan=gain, rose=stop)
- Tooltip solido com backdrop-blur

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/operations/MarginAnalysis.tsx` | **Novo** |
| `src/components/operations/OperationsDashboard.tsx` | Importar e renderizar MarginAnalysis |

