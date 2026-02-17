
# Limpeza de Paginas e Metricas Avancadas

## Resumo

Excluir as paginas `/financas` e `/calendario`, remover os 3 simuladores do dashboard de operacoes, e adicionar novas metricas avancadas ao componente existente.

---

## 1. Excluir Pagina /financas

- Remover rota `/financas` de `src/App.tsx`
- Remover lazy import de `Financas`
- Remover item "Financas" do menu em `src/components/dashboard/AppSidebar.tsx`
- Deletar arquivo `src/pages/Financas.tsx`

## 2. Excluir Pagina /calendario

- Remover rota `/calendario` de `src/App.tsx`
- Remover lazy import de `CalendarioEconomico`
- Remover item "Calendario" do menu em `src/components/dashboard/AppSidebar.tsx`
- Deletar arquivo `src/pages/CalendarioEconomico.tsx`

## 3. Remover Simuladores do Dashboard /operations

- Remover imports de `CapitalSimulator`, `MonteCarloSimulator` e `IntradayDecay` de `OperationsDashboard.tsx`
- Remover os 3 componentes do JSX (linhas 653-660)
- Deletar os 3 arquivos:
  - `src/components/operations/CapitalSimulator.tsx`
  - `src/components/operations/MonteCarloSimulator.tsx`
  - `src/components/operations/IntradayDecay.tsx`

## 4. Novas Metricas Avancadas (Recomendacao)

Adicionar 3 novas metricas ao componente `AdvancedMetrics.tsx` que complementam as 6 existentes, totalizando 9 metricas (grid 3x3):

### 4.1 - Calmar Ratio
- **Formula**: Retorno anualizado / Max Drawdown
- **Valor**: Quanto maior, melhor o retorno em relacao ao risco maximo
- **Descricao**: "Retorno vs risco extremo" - diferente do Sharpe que usa volatilidade, o Calmar foca no pior cenario
- **Cor**: Emerald se > 1, Rose se < 1

### 4.2 - Tail Ratio (Razao de Cauda)
- **Formula**: Percentil 95 dos ganhos / |Percentil 5 das perdas|
- **Valor**: Se > 1, os ganhos extremos superam as perdas extremas
- **Descricao**: "Caudas favoraveis" - mede se os outliers jogam a favor ou contra
- **Cor**: Cyan se > 1, Rose se < 1

### 4.3 - Ulcer Index
- **Formula**: Raiz quadrada da media dos drawdowns ao quadrado
- **Valor**: Quanto menor, mais suave a curva de equity (menos "dor")
- **Descricao**: Mede o estresse emocional baseado na profundidade e duracao dos drawdowns
- **Cor**: Emerald se < 5, Amber se entre 5-15, Rose se > 15

Essas 3 metricas sao usadas por gestores profissionais e agregam uma visao de risco que as metricas atuais nao cobrem: risco de cauda, risco extremo e "conforto" da curva de equity.

---

## Detalhes Tecnicos

### Arquivos modificados
- `src/App.tsx` - remover 2 rotas e 2 imports
- `src/components/dashboard/AppSidebar.tsx` - remover 2 itens do menu
- `src/components/operations/OperationsDashboard.tsx` - remover 3 imports e 3 componentes do JSX

### Arquivos deletados
- `src/pages/Financas.tsx`
- `src/pages/CalendarioEconomico.tsx`
- `src/components/operations/CapitalSimulator.tsx`
- `src/components/operations/MonteCarloSimulator.tsx`
- `src/components/operations/IntradayDecay.tsx`

### Arquivo com logica adicionada
- `src/components/dashboard/AdvancedMetrics.tsx` - adicionar calculo de Calmar Ratio, Tail Ratio e Ulcer Index na funcao `calculateMetrics`, adicionar os 3 novos `MetricCard` no grid, atualizar interface `Metrics` e `HistoricalMetrics`

### Layout final do grid de metricas

```text
Sharpe Ratio  |  Max Drawdown   |  Profit Factor
Expectancy    |  Recovery Factor |  Drawdown Duration
Calmar Ratio  |  Tail Ratio     |  Ulcer Index
```
