

# Ajuste do Desempenho Mensal por Ano — Capital Fixo de R$ 25.000

## Resumo

Alterar o componente `MonthlyPerformanceTable.tsx` para:

1. Usar capital base de **R$ 25.000** (em vez de R$ 10.000)
2. Calcular cada mes como **resultado / 25.000 * 100** (capital fixo, sem acumular)

## Mudancas

### Arquivo: `src/components/operations/MonthlyPerformanceTable.tsx`

**Linha 19** — Alterar o valor default de `capitalBase` de `10000` para `25000`

**Linhas 37-49** — Simplificar o calculo removendo a acumulacao de capital:
- Remover `let capital = capitalBase` e `capital += result`
- Cada mes passa a ser: `(result / capitalBase) * 100` (denominador fixo)
- O acumulado do ano continua sendo a composicao multiplicativa dos retornos mensais

Antes:
```
let capital = capitalBase;
const pct = capital > 0 ? (result / capital) * 100 : 0;
capital += result;
```

Depois:
```
const pct = capitalBase > 0 ? (result / capitalBase) * 100 : 0;
// sem alterar capital
```

Nenhum outro arquivo precisa ser alterado.
