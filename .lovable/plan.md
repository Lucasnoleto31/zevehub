

# Plano: Reduzir Tempo de Carregamento de 1-3min para menos de 30s

## Problema Atual

O dashboard busca 75.269 operacoes em lotes de 1.000, gerando **~76 requisicoes HTTP sequenciais**. Cada requisicao tem ~200-500ms de latencia, resultando em 15-38 segundos so de rede, mais o tempo de concatenacao ineficiente dos arrays.

## Solucao

Duas otimizacoes combinadas no arquivo `src/components/operations/OperationsDashboard.tsx`:

### 1. Aumentar batch size de 1.000 para 5.000

Reduz o numero total de requisicoes de ~76 para ~16.

### 2. Buscar em paralelo (4 requisicoes simultaneas)

Em vez de esperar cada requisicao terminar antes de iniciar a proxima, disparar 4 requisicoes ao mesmo tempo. Com 16 batches no total e 4 em paralelo, sao apenas **4 rodadas de requisicoes**.

### 3. Corrigir concatenacao ineficiente de array

O codigo atual faz `allOperations = [...allOperations, ...data]` a cada iteracao, criando um novo array gigante 76 vezes. Substituir por `allOperations.push(...data)` que modifica o array in-place.

### 4. Adicionar indicador de progresso

Mostrar ao usuario uma barra de progresso durante o carregamento, indicando quantos registros ja foram carregados.

---

## Estimativa de Performance

```text
ANTES:
  76 requisicoes sequenciais x ~300ms = ~23 segundos
  + 76 copias de array = ~3-5 segundos
  = Total: ~26-28 segundos

DEPOIS:
  16 requisicoes em 4 rodadas paralelas x ~300ms = ~1.2 segundos
  + push direto no array = ~0ms
  = Total: ~2-5 segundos
```

---

## Detalhes Tecnicos

### Arquivo: `src/components/operations/OperationsDashboard.tsx`

**Novo `loadOperations()`:**

1. Primeiro, buscar o total de registros com `.select('*', { count: 'exact', head: true })` para saber quantos batches serao necessarios
2. Calcular os ranges necessarios (ex: 0-4999, 5000-9999, ...)
3. Disparar as requisicoes em grupos de 4 em paralelo usando `Promise.all()`
4. Concatenar resultados com `push(...data)`
5. Atualizar progresso a cada grupo completado

**Novo estado de progresso:**

```text
const [loadingProgress, setLoadingProgress] = useState(0);
const [totalToLoad, setTotalToLoad] = useState(0);
```

**Tela de loading atualizada:**

Substituir o spinner simples por uma barra de progresso que mostra "Carregando X de Y operacoes..." com porcentagem visual.

### Fluxo de execucao

```text
1. Buscar count total (1 requisicao, ~100ms)
2. Gerar lista de ranges: [0-4999, 5000-9999, ..., 70000-74999, 75000-75268]
3. Rodada 1: fetch ranges 0-3 em paralelo (~300ms)
4. Rodada 2: fetch ranges 4-7 em paralelo (~300ms)
5. Rodada 3: fetch ranges 8-11 em paralelo (~300ms)
6. Rodada 4: fetch ranges 12-15 em paralelo (~300ms)
7. Ordenar array final e definir estado
Total: ~1.3 segundos de rede
```

### Nenhuma outra mudanca necessaria

- Os filtros, calculos de stats e geracao de graficos permanecem identicos
- A estrutura dos dados retornados e a mesma
- Apenas o metodo de busca muda

