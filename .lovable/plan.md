

# Margem Media Necessaria por Hora

## Resumo

Modificar o componente `MarginAnalysis.tsx` existente para adicionar a analise de margem de capital necessaria por hora, baseada em R$ 150,00 por contrato. O componente ja tem a estrutura de cards, graficos e tooltips -- sera expandido com a logica de margem por contrato.

## O que ja existe e sera mantido

O componente atual ja calcula:
- Contratos por (data, hora) via `dateHourContractMap`
- Margem media e pico por hora (usando `contracts * 100` simplificado)
- Stop/Gain ideal com +40% de seguranca
- 5 cards resumo + 2 graficos + legenda

## Alteracoes

### 1. Constante de margem por contrato

Alterar o calculo simplificado de `contracts * 100` para usar a constante correta:

```text
MARGIN_PER_CONTRACT = 150  // R$ 150,00 por contrato (ja com desagio de 30%)
```

Linha afetada no calculo: `const margin = contracts * 100` sera alterada para `const margin = contracts * MARGIN_PER_CONTRACT`.

### 2. Adicionar card "Contratos Medios/Dia"

Substituir o card "Total Horas" (que mostra apenas a quantidade de janelas analisadas, informacao pouco util) por um card mais relevante:

| Card antigo | Card novo |
|-------------|-----------|
| Total Horas (violet) | Contratos Medios/Dia (violet) |

O valor sera calculado como: total de contratos em todas as operacoes dividido pelo numero de dias unicos operados.

### 3. Atualizar sublabels dos cards de margem

- Margem Media: "R$ 150/contrato x media horaria"
- Margem Pico: "Pior cenario historico registrado"

### 4. Sem alteracao nos graficos

Os graficos ja mostram margem media (barras) e margem pico (linha) por hora, e stop/gain ideal por hora. A unica mudanca e o valor absoluto (de x100 para x150).

## Detalhes tecnicos

### Arquivo modificado
- `src/components/operations/MarginAnalysis.tsx` -- unico arquivo alterado

### Mudancas especificas

1. **Linha 23**: Adicionar `const MARGIN_PER_CONTRACT = 150;`
2. **Linha 59**: Alterar `const margin = contracts * 100` para `const margin = contracts * MARGIN_PER_CONTRACT`
3. **Calculo de contratos medios/dia**: Novo campo `avgContractsPerDay` no `summaryStats`, calculado a partir do total de contratos / dias unicos
4. **Cards array** (linha ~130): Substituir card "Total Horas" por "Contratos Medios/Dia"
5. **Sublabels**: Atualizar textos descritivos dos cards de margem

### Impacto
- Valores de margem serao 50% maiores (de x100 para x150)
- Card "Total Horas" substituido por metrica mais util
- Nenhuma alteracao estrutural no componente

