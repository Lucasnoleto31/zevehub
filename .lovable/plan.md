

# Heatmap de Validacao Cruzada (Historico x Mes Atual)

## Resumo

Criar um novo componente `CrossValidationHeatmap` que cruza o desempenho historico completo com o mes atual, gerando um sinal visual claro de "Ligar" ou "Nao Ligar" o robo para cada slot horario/dia da semana.

---

## Logica de Validacao

Para cada celula (dia da semana x hora):

- **Camada 1 - Historico**: resultado total do slot considerando TODO o historico (excluindo mes atual)
- **Camada 2 - Mes Atual**: resultado total do slot apenas no mes corrente

Sinais:
- **LIGAR** (verde): Historico positivo E Mes atual positivo
- **ALERTA** (amarelo): Apenas um dos dois positivo (divergencia)
- **NAO LIGAR** (vermelho): Historico negativo E Mes atual negativo
- **SEM DADOS** (cinza): Sem operacoes em uma ou ambas as camadas

---

## O que mostra

### Heatmap Grid (5 colunas x 9 linhas = Seg-Sex x 9h-17h)
- Cada celula exibe um icone de sinal: check (ligar), alerta (divergencia), X (nao ligar)
- Cores: verde forte (ambos positivos), amarelo/amber (divergencia), vermelho (ambos negativos)

### Tooltip detalhado ao hover
- Resultado historico (R$ total + numero de operacoes)
- Resultado mes atual (R$ total + numero de operacoes)
- Sinal final: "LIGAR", "DIVERGENCIA", "NAO LIGAR"
- Detalhe da divergencia: qual camada esta negativa

### Cards resumo abaixo do heatmap
- **Slots para Ligar**: quantidade de celulas com sinal verde
- **Slots em Alerta**: quantidade com divergencia
- **Slots para Nao Ligar**: quantidade com sinal vermelho
- **Score Geral**: percentual de slots verdes sobre o total com dados

### Legenda
- Verde = Historico + Mes Atual positivos (Ligar)
- Amarelo = Divergencia (Cautela)
- Vermelho = Ambos negativos (Nao Ligar)
- Cinza = Sem dados suficientes

---

## Detalhes Tecnicos

### Arquivo criado
- `src/components/operations/CrossValidationHeatmap.tsx`

### Arquivo modificado
- `src/components/operations/OperationsDashboard.tsx` - importar e posicionar antes do PerformanceHeatmap existente

### Props
- `filteredOperations` (mesmo padrao dos outros componentes)
- Internamente separa as operacoes em "historico" (tudo exceto mes atual) e "mes atual" usando `new Date()` para determinar o mes corrente

### Processamento
1. Determinar o mes atual (YYYY-MM)
2. Separar operacoes em dois grupos: `historical` (operation_date nao comeca com mes atual) e `currentMonth` (comeca com mes atual)
3. Para cada celula (weekday x hour), calcular resultado total de cada grupo
4. Aplicar logica de sinal cruzado
5. Renderizar grid com cores e icones

### Design
- Card premium com titulo "Validacao Cruzada" e icone Shield/ShieldCheck
- Tema com gradiente verde/amber/vermelho
- Mesmo layout de grid do PerformanceHeatmap existente (consistencia visual)
- Suporte a tema dark/light com toggle
- Tooltips escuros com detalhamento das duas camadas
- Animacoes framer-motion nas celulas
- Responsivo com scroll horizontal em mobile

### Posicionamento no Dashboard

```text
...
PerformanceCalendar
--> CrossValidationHeatmap (NOVO)
PerformanceHeatmap (existente)
TopPerformanceDays
```

