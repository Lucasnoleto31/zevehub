

# Refazer Logica de Margem por Hora

## Resumo

Corrigir a logica de agrupamento de contratos no `MarginAnalysis.tsx`. A unica mudanca real e na linha 39.

## Alteracao

### Arquivo: `src/components/operations/MarginAnalysis.tsx`

**Linha 39** -- Mudar de `Math.max` para soma:

```text
// ATUAL (pega apenas o maior contrato na janela):
dateHourContractMap[date][hour] = Math.max(dateHourContractMap[date][hour] || 0, op.contracts);

// NOVO (soma todos os contratos na janela):
dateHourContractMap[date][hour] = (dateHourContractMap[date][hour] || 0) + op.contracts;
```

## Por que isso importa

- **Antes**: Para cada (dia, hora), pegava apenas o maior contrato individual. Subestimava a margem necessaria quando havia multiplas operacoes na mesma hora.
- **Depois**: Soma todos os contratos operados naquela hora naquele dia, refletindo o capital real necessario para cobrir todas as posicoes simultaneas.

## Impacto nos dados

- Margem Media e Margem Pico ficarao maiores (mais realistas)
- Stop/Gain Ideal e demais cards nao sao afetados (usam resultados, nao contratos)
- Os graficos refletirao os novos valores automaticamente

## Nenhuma outra alteracao

Cards, graficos, tooltips, legenda, constante R$150/contrato -- tudo permanece identico. Apenas a regra de agrupamento de contratos muda.

