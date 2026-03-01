

# Validacao Cruzada — Mes Atual = Todos os Marços de Todos os Anos

## Problema

Hoje o componente separa as operacoes assim:
- **Historico**: tudo que NAO e marco de 2026
- **Mes atual**: somente marco de 2026

Como marco de 2026 acabou de comecar, quase nao tem dados. Alem disso, a logica correta que voce quer e comparar o historico completo com a performance historica do mes corrente (marco) em TODOS os anos.

## Solucao

Alterar a separacao dos dados no `CrossValidationHeatmap.tsx`:

- **Historico (Camada 1)**: TODAS as operacoes (sem filtro — todo o historico completo)
- **Mes Atual (Camada 2)**: Todas as operacoes cujo mes (MM) seja igual ao mes atual, de QUALQUER ano (ex: marco de 2018, 2019, 2020, ..., 2026)

### Mudanca no codigo

**Arquivo**: `src/components/operations/CrossValidationHeatmap.tsx`

**Linhas 39-43** — Alterar a logica de separacao:

Antes:
```typescript
const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const historical = operations.filter(op => !op.operation_date.startsWith(currentYM));
const currentMonth = operations.filter(op => op.operation_date.startsWith(currentYM));
```

Depois:
```typescript
const currentMonthNum = String(now.getMonth() + 1).padStart(2, "0");
const historical = operations; // historico completo
const currentMonth = operations.filter(op => {
  const month = op.operation_date.split("-")[1];
  return month === currentMonthNum;
});
```

**Atualizar o subtitulo** do componente para refletir a nova logica:
- De: "Historico completo x Mes atual"
- Para: "Historico completo x Todos os [nome do mes]s"

Exemplo: "Historico completo x Todos os Marcos" (quando o mes atual for marco)

### Detalhes adicionais

- Adicionar array de nomes de meses em portugues para exibir no subtitulo
- Nenhum outro arquivo precisa ser alterado

