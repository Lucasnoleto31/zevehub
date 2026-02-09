

# Remover Card "Margem Pico"

## Alteracao

### Arquivo: `src/components/operations/MarginAnalysis.tsx`

Remover o segundo card do array `cards` (Margem Pico, cor amber, icone AlertTriangle) e ajustar o grid de 5 para 4 cards.

### Mudancas especificas:

1. **Remover do array `cards`** (linha ~133): Remover o objeto `{ label: "Margem Pico", value: formatCurrency(summaryStats.peakMargin), ... }`

2. **Remover do `summaryStats`**: Remover `peakMargin` do retorno e do calculo de `globalPeakMargin`

3. **Remover dos dados horarios**: Remover `peakMargin` do objeto `data.push()`

4. **Remover do Grafico 1**: Remover a `<Line>` de `peakMargin` do ComposedChart (linha do pico amber)

5. **Remover do Tooltip**: Remover a linha "Margem Pico" do `MarginTooltip`

6. **Remover da Legenda**: Remover o item "Margem Pico" (quadrado amber)

7. **Ajustar grid**: De `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` para `grid-cols-2 sm:grid-cols-2 lg:grid-cols-4`

