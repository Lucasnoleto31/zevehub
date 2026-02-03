
# Plano: Restringir Estratégias para Apenas 3

## Objetivo
Manter apenas **Alaska & Square**, **Ares** e **Orion** no sistema, removendo todas as outras estratégias.

---

## Alterações Necessárias

### 1. Atualizar Whitelist no Código

**Arquivo:** `src/components/operations/OperationsDashboard.tsx`

Alterar a lista de estratégias permitidas em **dois locais** (linhas 132-141 e 166-175):

```typescript
// De:
const allowedStrategies = [
  'alaska & square',
  'apollo',
  'ares',
  'artemis',
  'orion',
  'pegasus',
  'ventture',
  'zeus'
];

// Para:
const allowedStrategies = [
  'alaska & square',
  'ares',
  'orion'
];
```

### 2. Limpar Tabela de Estratégias (SQL)

Executar migração para remover estratégias não desejadas:

```sql
DELETE FROM strategies 
WHERE LOWER(name) NOT IN ('alaska & square', 'ares', 'orion');
```

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| 8 estratégias visíveis | 3 estratégias visíveis |
| Apollo, Artemis, Pegasus, Ventture, Zeus | Removidas do dashboard |
| Filtros mostram todas | Filtros mostram apenas 3 |

---

## Nota Importante

As **operações históricas** (trading_operations) das estratégias removidas permanecerão no banco de dados, mas **não serão exibidas** no Dashboard Geral porque a whitelist as filtrará. Se desejar excluir também os dados históricos dessas estratégias, isso pode ser feito posteriormente.
