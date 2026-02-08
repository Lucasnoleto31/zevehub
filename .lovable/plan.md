

# Adicionar Margem de Seguranca de +40% no Stop Ideal

## Resumo
Aplicar um multiplicador de 1.4 (equivalente a +40%) sobre o valor calculado do Stop Ideal, criando uma margem de seguranca para proteger o trader contra oscilacoes mais fortes que a media historica.

## Exemplo pratico
- Media historica de perda as 9h = R$ 400
- Stop Ideal com margem de seguranca = R$ 400 x 1.40 = **R$ 560**

## O que sera modificado

### Arquivo: `src/components/operations/MarginAnalysis.tsx`

#### 1. Nova constante
Adicionar constante `STOP_SAFETY_MARGIN = 1.4` junto com as demais constantes (linha 23-24).

#### 2. Calculo por hora (linha 119)
Aplicar o multiplicador no calculo do `avgStop`:
- De: `Math.round(Math.abs(sg.lossSum / sg.lossCount))`
- Para: `Math.round(Math.abs(sg.lossSum / sg.lossCount) * STOP_SAFETY_MARGIN)`

#### 3. Calculo do summary (linha 149-151)
O `overallAvgStop` ja e derivado dos valores por hora, entao automaticamente refletira a margem de seguranca aplicada no passo anterior. Nenhuma alteracao adicional necessaria aqui.

#### 4. Atualizar sublabel do card "Stop Ideal" (linha 240)
Mudar de `"Média geral das perdas/hora"` para `"Média + 40% margem de segurança"` para deixar claro ao usuario que o valor ja inclui a protecao extra.

#### 5. Atualizar descricao do card do grafico (linha 343)
Mudar de `"Baseado no resultado médio acumulado por janela de horário"` para `"Baseado no resultado médio acumulado por janela (stop com +40% de segurança)"`.

## Detalhes tecnicos

### Constante
```text
STOP_SAFETY_MARGIN = 1.4  // +40% de margem de seguranca
```

### Formula atualizada
```text
avgStop = Math.round(|media_perdas_hora| * 1.4)
```

### Arquivo modificado
- `src/components/operations/MarginAnalysis.tsx` -- unico arquivo alterado

### Impacto
- Card resumo "Stop Ideal" mostrara valores 40% maiores
- Grafico de barras vermelhas (Stop) ficara proporcionalmente maior
- Tooltips refletirao o valor ajustado automaticamente
- Gain Ideal permanece inalterado

