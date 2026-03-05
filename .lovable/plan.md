

# Validação Cruzada — Reescrita Completa com Análise Estatística por Slot

## Resumo

Reescrever o componente `CrossValidationHeatmap` com um motor estatístico completo que analisa cada slot (dia × hora) mês a mês, calcula métricas avançadas (winrate, drawdown, recovery) e classifica os slots com base nessas métricas. Adicionar modal de detalhamento ao clicar em um slot e card "Posso ligar o robô agora?".

## Arquitetura

```text
CrossValidationHeatmap (container principal)
├── Motor estatístico (useMemo)
│   ├── Agrupa trades por slot (weekday × hour)
│   ├── Separa cada slot por mês (YYYY-MM)
│   ├── Calcula métricas por mês: trades, resultado, winrate, drawdown, recovery
│   ├── Consolida histórico do slot: meses+, meses-, % positivos, mediana recovery, dd médio
│   └── Classifica: LIGAR / ALERTA / NAO_LIGAR / SEM_DADOS
├── Heatmap visual (grid dia × hora) — clicável
├── Modal de detalhamento do slot (Dialog)
│   ├── Métricas consolidadas
│   └── Tabela mês a mês com resultado, trades, winrate, drawdown, recovery
├── Card "Posso ligar o robô agora?"
│   └── Consulta slot do dia/hora atual e exibe recomendação
└── Summary cards + Legenda
```

## Mudanças

### Arquivo: `src/components/operations/CrossValidationHeatmap.tsx` — Reescrita completa

**Motor estatístico (useMemo):**

1. Para cada operação, derivar weekday (1-5), hour (9-17), e monthKey (YYYY-MM)
2. Agrupar em estrutura: `Map<slotKey, Map<monthKey, Trade[]>>`
3. Para cada mês de cada slot, calcular:
   - `trades`: contagem
   - `result`: soma dos resultados
   - `winrate`: trades positivos / total × 100
   - `maxDrawdown`: maior queda acumulada sequencial dentro do mês
   - `recovery`: result > 0 && maxDrawdown > 0 ? result / maxDrawdown : 0
4. Consolidar o slot:
   - Total de meses analisados
   - Meses positivos / negativos / % positivos
   - Mediana do recovery (ordenar valores, pegar mediana)
   - Drawdown médio
   - Percentil pessimista P10 dos resultados mensais
5. Classificar:
   - **LIGAR**: >= 60% meses positivos E mediana recovery > 1
   - **ALERTA**: entre 40-60% meses positivos OU recovery entre 0.5-1
   - **NAO_LIGAR**: < 40% meses positivos OU drawdown médio elevado
   - **SEM_DADOS**: < 3 meses de histórico ou < 5 trades total

**Interface CellData expandida:**
- Todas as métricas consolidadas (meses analisados, % positivos, mediana recovery, dd médio, resultado médio mensal)
- Array de dados mensais para o modal

**Heatmap grid:**
- Manter visual atual (grid dia × hora com cores verde/amarelo/vermelho/cinza)
- Tornar células clicáveis — ao clicar, abrir Dialog com detalhamento

**Modal de detalhamento (Dialog):**
- Header: "Terça-feira 10h" + badge do sinal
- Métricas consolidadas: meses analisados, trades total, % meses positivos, recovery mediano, drawdown médio, resultado médio mensal
- Tabela scrollável com colunas: Mês | Trades | Resultado | Winrate | Drawdown | Recovery
- Cada linha colorida (verde/vermelho) conforme resultado

**Card "Posso ligar o robô agora?":**
- Detecta dia da semana e hora atual
- Busca o slot correspondente nos dados calculados
- Exibe sinal com ícone grande + texto explicativo
- Se fora do horário de mercado (antes das 9h ou após 17h, ou fim de semana): "Mercado fechado"

**Summary cards atualizados:**
- Slots para Ligar / Slots em Alerta / Não Ligar / Score Geral (mantém layout)

### Nenhum outro arquivo precisa ser alterado
O componente já recebe `operations` do `OperationsDashboard` e a interface `Operation` já tem `operation_date`, `operation_time` e `result`.

## Detalhes técnicos

- Usar `Dialog` de `@/components/ui/dialog` para o modal
- Manter tema dark/light toggle existente
- Manter framer-motion nas animações
- Calcular tudo em um único `useMemo` para performance (dataset de 216k+ ops)
- Mediana: ordenar array, pegar elemento do meio
- Percentil P10: ordenar, pegar índice `Math.floor(0.1 * length)`
- Drawdown intra-mês: iterar trades do mês cronologicamente, manter `peak` e `maxDd = Math.min(maxDd, accumulated - peak)`

