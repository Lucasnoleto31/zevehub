
# Simulador de Capital + Monte Carlo + Decaimento Intraday

## Resumo

Criar 3 novos componentes de analise para o dashboard `/operations`:

---

## 1. Simulador de Capital (CapitalSimulator)

O usuario digita o capital inicial (ex: R$ 5.000) e o sistema simula dia a dia usando os resultados reais filtrados.

**O que mostra:**
- Campo de input para o usuario digitar o capital (com formatacao em R$)
- Grafico AreaChart mostrando a evolucao do saldo ao longo dos dias (capital + resultados diarios acumulados)
- Linha de referencia em R$ 0 (quebra da conta)
- Cards com metricas:
  - **Saldo Final**: quanto teria ao final do periodo
  - **Dias para Quebrar**: quantos dias levaria para o saldo chegar a zero (se aplicavel), ou "Nao quebrou" se o capital sobreviveu
  - **Rendimento %**: percentual de retorno sobre o capital
  - **Drawdown Maximo**: maior queda percentual do saldo em relacao ao pico
- Cores: verde enquanto acima do capital inicial, vermelho quando abaixo, linha pontilhada no zero

**Logica:** Agrupa operacoes por dia (sorted), acumula resultado diario ao saldo. Se saldo <= 0, marca o dia de quebra.

---

## 2. Simulador Monte Carlo (MonteCarloSimulator)

Gera multiplas simulacoes aleatorias usando os resultados diarios historicos para projetar cenarios futuros.

**O que mostra:**
- Botao "Simular" que roda 500 simulacoes de N dias (mesmo numero de dias do historico)
- Grafico com 3 linhas:
  - **Melhor cenario** (percentil 95) - verde
  - **Cenario mediano** (percentil 50) - azul
  - **Pior cenario** (percentil 5) - vermelho
- Cards com metricas:
  - **Probabilidade de Lucro**: % das simulacoes que terminaram positivas
  - **Resultado Mediano**: valor do percentil 50
  - **VaR 95%**: Value at Risk - pior resultado esperado com 95% de confianca
  - **Melhor Cenario**: resultado do percentil 95

**Logica:** Pega todos os resultados diarios reais, embaralha aleatoriamente 500 vezes, acumula cada sequencia. Calcula percentis sobre os resultados finais. Renderiza curvas de percentil.

---

## 3. Decaimento Intraday (IntradayDecay)

Mostra como o resultado medio evolui hora a hora dentro do dia de operacao.

**O que mostra:**
- Grafico AreaChart com o eixo X sendo as horas (9h-17h) e o Y sendo o resultado medio acumulado
- A curva mostra se os robos tendem a ganhar de manha e devolver a tarde (decaimento) ou se acumulam ao longo do dia
- Cards com:
  - **Melhor Horario**: hora com maior resultado medio
  - **Pior Horario**: hora com maior perda media
  - **Pico do Dia**: horario onde o resultado acumulado atinge o maximo
  - **Decaimento**: diferenca entre o pico e o resultado final (se positivo, ha decaimento)

**Logica:** Agrupa operacoes por hora, calcula resultado medio por hora, acumula sequencialmente das 9h as 17h.

---

## Detalhes Tecnicos

### Arquivos criados
- `src/components/operations/CapitalSimulator.tsx` - input de capital + grafico de evolucao do saldo + cards de metricas
- `src/components/operations/MonteCarloSimulator.tsx` - simulacao randomizada + grafico de percentis + cards
- `src/components/operations/IntradayDecay.tsx` - grafico de evolucao intraday hora a hora + cards

### Arquivo modificado
- `src/components/operations/OperationsDashboard.tsx` - importar e posicionar os 3 novos componentes

### Props
Todos recebem `filteredOperations` como prop (mesmo padrao do MarginAnalysis). O CapitalSimulator gerencia o estado do capital internamente via useState.

### Posicionamento no Dashboard

```text
RobosHero
RobosFilters
RobosQuickStats
RobosCharts
MarginAnalysis
--> CapitalSimulator (NOVO)
--> MonteCarloSimulator (NOVO)
--> IntradayDecay (NOVO)
AdvancedMetrics
PerformanceCalendar
Heatmap + TopDays
```

### Design
- Mesmo estilo premium: gradientes, bordas coloridas (/20), hover effects, backdrop-blur
- CapitalSimulator: tema emerald/cyan (capital positivo) com transicao para vermelho (negativo)
- Monte Carlo: tema azul/violeta (projecao)
- Intraday Decay: tema amber/laranja (tempo)
- Tooltips escuros (#0a0a1a) consistentes
- Input de capital com estilo premium, borda animada no focus
- Botao "Simular" no Monte Carlo com loading state
- Responsivo: empilhado em mobile
- Animacoes com framer-motion
