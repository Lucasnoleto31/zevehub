
# Margem Media Necessaria por Hora

## Resumo
Remover o **Otimizador de Estrategias** e o **AI Insights** do dashboard Geral (/operations) e substituir por um novo componente de **Analise de Margem por Hora**, mostrando quanto capital e necessario por janela de horario baseado no historico de operacoes.

## Regra de calculo
- Margem fixa: **R$ 150,00 por contrato** (ja com desagio de 30% aplicado)
- Para cada dia operado, agrupa operacoes por hora e soma os contratos naquela janela
- Calcula a **media de contratos simultaneos por hora** (ao longo de todos os dias)
- Calcula o **pico maximo de contratos por hora** (pior cenario historico)
- Margem media = media_contratos x R$ 150
- Margem recomendada (pico) = max_contratos x R$ 150

## O que sera feito

### 1. Remocoes no OperationsDashboard.tsx
- Remover import do `StrategyOptimizer`
- Remover import do `AIInsightsCard`
- Remover o bloco `<StrategyOptimizer ... />` (linhas 618-624)
- Remover o bloco `<AIInsightsCard ... />` (linha 671-672)
- Remover a funcao `handleApplyOptimizedConfig` (que era usada apenas pelo StrategyOptimizer)

### 2. Atualizar query de dados
- Adicionar `contracts` ao select da query: `"operation_date, operation_time, result, strategy, contracts"`
- Atualizar a interface `Operation` para incluir `contracts: number`

### 3. Novo componente: MarginAnalysis.tsx

Um card premium seguindo o padrao visual do `RobosCharts` (ChartCard) com:

**Cards resumo no topo (3 cards):**
- Margem media geral (media de todos os horarios)
- Hora com maior demanda de margem (pico)
- Contratos medios por dia

**Grafico de barras por hora (9h-18h):**
- Barra principal: margem media necessaria (R$)
- Linha de referencia (ReferenceLine): margem de pico/seguranca
- Tooltip premium (padrao escuro) mostrando:
  - Hora
  - Media de contratos
  - Max contratos
  - Margem media (R$)
  - Margem recomendada de pico (R$)

**Design:**
- Segue o padrao visual premium existente (gradientes, framer-motion, cores condicionais)
- Cores: azul/cyan para a barra media, amber/dourado para a linha de pico
- Icone: `DollarSign` ou `Shield` do lucide-react

### 4. Integracao no Dashboard
- Posicionar o `MarginAnalysis` logo apos o `RobosCharts` e antes do `AdvancedMetrics`
- Passar `filteredOperations` como prop (que agora inclui `contracts`)

## Detalhes tecnicos

### Arquivos modificados
- `src/components/operations/OperationsDashboard.tsx` -- remover imports/blocos antigos, adicionar import/bloco novo, expandir interface e query

### Arquivo novo
- `src/components/operations/MarginAnalysis.tsx` -- componente de analise de margem

### Fluxo de dados

```text
OperationsDashboard
  |-- loadOperations() busca "contracts" junto com os demais campos
  |-- filteredOperations inclui contracts
  |
  MarginAnalysis (recebe filteredOperations)
    |-- Agrupa por (data + hora)
    |-- Soma contratos por janela horaria por dia
    |-- Para cada hora: calcula media e max ao longo dos dias
    |-- Aplica R$ 150 por contrato
    |-- Renderiza grafico de barras + cards resumo
```

### Constantes
```text
MARGIN_PER_CONTRACT = 150  (R$ 150 ja com desagio)
MARKET_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17]  (horario de mercado)
```
