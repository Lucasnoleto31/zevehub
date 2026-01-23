
# Plano: Melhor Configuracao por Robo com Filtros Personalizaveis

## Objetivo
Criar um sistema que mostre a melhor configuracao (horarios, dias, meses) para cada robo, com opcao do usuario aplicar essa configuracao automatica ou personalizar os filtros manualmente.

---

## Visao Geral da Solucao

O dashboard de operacoes tera dois modos de visualizacao:

1. **Modo "Melhor Configuracao"**: Ao selecionar um robo especifico, o sistema automaticamente aplica os filtros com os melhores horarios, dias e meses baseado em dados historicos
2. **Modo "Filtro Manual"**: O usuario pode ajustar qualquer filtro livremente

---

## Componentes a Criar/Modificar

### 1. Novo Componente: `BestConfigCard.tsx`
Card que mostra a melhor configuracao calculada para cada estrategia:

```
┌─────────────────────────────────────────────────────────────┐
│  🤖 Apollo                                      [Aplicar]   │
├─────────────────────────────────────────────────────────────┤
│  Melhor Configuracao Baseada em Dados Historicos           │
│                                                             │
│  🕐 Melhores Horarios    📅 Melhores Dias    📆 Melhores Meses │
│  ┌─────────────────┐    ┌─────────────┐     ┌────────────┐ │
│  │ 9h   +R$ 6.130  │    │ Seg +R$7.124│     │ Dez +R$3.461│ │
│  │ 12h +R$20.104  │    │ Ter +R$4.206│     │             │ │
│  │ 13h  +R$ 5.070  │    │             │     │             │ │
│  └─────────────────┘    └─────────────┘     └────────────┘ │
│                                                             │
│  📊 Resultado Estimado: +R$ 33.000 (usando melhor config)   │
└─────────────────────────────────────────────────────────────┘
```

### 2. Modificar: `OperationsDashboard.tsx`

Adicionar:
- Estado para armazenar as melhores configuracoes por estrategia
- Funcao `calculateBestConfig(strategyName)` que analisa dados e retorna melhores filtros
- Toggle para alternar entre modo automatico e manual
- Logica para aplicar filtros da melhor configuracao quando usuario clicar

### 3. Modificar: `RobosFilters.tsx`

Adicionar:
- Prop para receber "configuracao sugerida"
- Botao "Aplicar Melhor Configuracao" por estrategia
- Indicador visual de quais filtros estao na configuracao otima
- Badge "Otimizado por IA" quando usar configuracao automatica

---

## Logica de Calculo da Melhor Configuracao

Para cada estrategia, calcular:

```typescript
interface BestConfig {
  strategy: string;
  bestHours: { hour: number; result: number; winRate: number }[];
  bestWeekdays: { day: number; result: number; winRate: number }[];
  bestMonths: { month: number; result: number; winRate: number }[];
  estimatedResult: number; // Resultado se usar apenas melhores configs
  confidence: number; // % de confianca baseado em volume de dados
}

// Criterios:
// - Horarios com resultado POSITIVO
// - Dias da semana com resultado POSITIVO  
// - Meses com resultado POSITIVO
// - Ordenados por resultado total (maior primeiro)
```

**Exemplo real baseado nos dados do banco:**

| Estrategia | Melhores Horarios | Melhores Dias | Melhores Meses |
|------------|-------------------|---------------|----------------|
| Alaska & Square | 11h, 12h, 13h | Sexta, Quarta, Terca | Abril, Set, Jan |
| Apollo | 12h, 9h, 13h | Segunda, Terca | Dezembro |
| Ventture | 9h, 10h, 11h | Quinta, Quarta | Outubro, Set, Julho |
| Orion | 12h, 18h, 13h | Sexta, Quarta, Quinta | Fevereiro, Outubro |

---

## Fluxo de Usuario

```
┌──────────────────────────────────────────────────────────────────┐
│                    Dashboard de Robos                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Usuario abre o dashboard                                      │
│     ↓                                                             │
│  2. Sistema calcula melhor config para cada robo                  │
│     ↓                                                             │
│  3. Cards mostram preview da melhor config por robo               │
│     ↓                                                             │
│  4. Usuario clica em um robo:                                     │
│     ├─→ [Aplicar Otimizado] → Filtra automaticamente              │
│     └─→ [Personalizar] → Abre filtros para edicao manual          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/operations/OperationsDashboard.tsx` | Adicionar calculo de melhor config, estado, e passagem de props |
| `src/components/operations/RobosFilters.tsx` | Adicionar botao "Aplicar Melhor Configuracao" e indicadores visuais |
| `src/components/operations/BestConfigCard.tsx` | **NOVO** - Card mostrando melhor config por estrategia |
| `src/components/operations/StrategyOptimizer.tsx` | **NOVO** - Componente que exibe lista de robos com suas configs otimas |

---

## Estrutura do Novo Componente `StrategyOptimizer.tsx`

```typescript
interface StrategyOptimizerProps {
  operations: Operation[];
  strategies: string[];
  onApplyConfig: (config: {
    strategy: string;
    hours: string[];
    weekdays: string[];
    months: string[];
  }) => void;
}

// Funcionalidades:
// 1. Grid de cards com cada estrategia
// 2. Calculo automatico dos melhores filtros
// 3. Botao para aplicar configuracao
// 4. Preview do resultado estimado
// 5. Comparacao: resultado total vs resultado otimizado
```

---

## Interface Visual

### Card de Estrategia Otimizada

```
┌───────────────────────────────────────────────────────────┐
│ 🤖 Ventture                             ⭐ Alta Confianca │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ MELHORES HORARIOS          MELHORES DIAS                  │
│ ┌─────────────────────┐   ┌─────────────────┐            │
│ │ ✅ 9h    +R$126.958 │   │ ✅ Qui  +R$75.085│            │
│ │ ✅ 10h   +R$ 27.402 │   │ ✅ Qua  +R$54.622│            │
│ │ ✅ 11h   +R$ 16.285 │   │ ✅ Sex  +R$15.087│            │
│ │ ❌ 12h   -R$  3.980 │   │ ✅ Ter  +R$13.467│            │
│ └─────────────────────┘   └─────────────────┘            │
│                                                           │
│ MELHORES MESES                                           │
│ ┌───────────────────────────────────────────┐            │
│ │ ✅ Out  +R$47.919  │ ✅ Set  +R$47.384    │            │
│ │ ✅ Jul  +R$30.731  │ ✅ Abr  +R$14.923    │            │
│ └───────────────────────────────────────────┘            │
│                                                           │
│ ┌───────────────────────────────────────────────────────┐│
│ │ 📊 Usando esta config: +R$173.403 estimado           ││
│ │    vs Total: +R$173.403                               ││
│ └───────────────────────────────────────────────────────┘│
│                                                           │
│ ┌────────────────────┐  ┌──────────────────────────────┐ │
│ │ 🎯 Aplicar Config  │  │ 🔧 Personalizar Filtros      │ │
│ └────────────────────┘  └──────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

---

## Detalhes Tecnicos

### Calculo da Melhor Configuracao

```typescript
const calculateBestConfig = (strategy: string, operations: Operation[]) => {
  const strategyOps = operations.filter(op => op.strategy === strategy);
  
  // Agrupar por hora
  const hourStats = strategyOps.reduce((acc, op) => {
    const hour = parseInt(op.operation_time.split(':')[0]);
    if (!acc[hour]) acc[hour] = { total: 0, positive: 0, result: 0 };
    acc[hour].total++;
    acc[hour].result += op.result;
    if (op.result > 0) acc[hour].positive++;
    return acc;
  }, {});

  // Filtrar apenas horarios com resultado POSITIVO
  const bestHours = Object.entries(hourStats)
    .filter(([_, data]) => data.result > 0)
    .sort((a, b) => b[1].result - a[1].result)
    .map(([hour, data]) => ({
      hour: parseInt(hour),
      result: data.result,
      winRate: (data.positive / data.total) * 100
    }));

  // Repetir para weekdays e months...
  
  return { strategy, bestHours, bestWeekdays, bestMonths, estimatedResult };
};
```

### Aplicacao do Filtro

Quando usuario clicar em "Aplicar Config":

```typescript
const handleApplyBestConfig = (config: BestConfig) => {
  // 1. Selecionar apenas a estrategia
  setStrategyFilter([config.strategy]);
  
  // 2. Aplicar melhores horarios
  setHourFilter(config.bestHours.map(h => h.hour.toString()));
  
  // 3. Aplicar melhores dias
  setWeekdayFilter(config.bestWeekdays.map(d => d.day.toString()));
  
  // 4. Aplicar melhores meses  
  setMonthFilter(config.bestMonths.map(m => m.month.toString()));
  
  // 5. Mostrar toast de confirmacao
  toast.success(`Configuracao otimizada aplicada para ${config.strategy}`);
};
```

---

## Resultado Final

1. **Usuario ve cards** de cada robo com sua melhor configuracao calculada
2. **Um clique** aplica todos os filtros otimos
3. **Mantém flexibilidade** - usuario pode ajustar qualquer filtro depois
4. **Indicador visual** mostra quando esta usando config otimizada vs manual
5. **Resultado estimado** mostra quanto ganharia usando apenas melhores configuracoes

---

## Beneficios para o Usuario

- **Economia de tempo**: Nao precisa testar todas combinacoes manualmente
- **Decisao baseada em dados**: Saber exatamente quais horarios/dias funcionam melhor
- **Flexibilidade**: Pode aplicar config otima e depois ajustar
- **Transparencia**: Ve exatamente porque aquela configuracao e recomendada
