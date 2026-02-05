

# Plano de Correção: Importação Resiliente para /operations

## Diagnóstico

O crash ocorreu porque:
- **Batch size muito pequeno** (10 registros) = muitas requisições
- **Delay insuficiente** (100ms) = banco não consegue se recuperar
- **Sem retry logic** = erros não são tratados adequadamente
- Para 42.000 operações: 4.200 batches = 4.200 requisições ao banco

## Solução Proposta

### Mudanças em `src/components/operations/OperationImport.tsx`

```text
┌─────────────────────────────────────────────────────────────┐
│              FLUXO DE IMPORTAÇÃO RESILIENTE                 │
├─────────────────────────────────────────────────────────────┤
│  1. Aumentar batch size: 10 → 50 registros                  │
│         ↓                                                   │
│  2. Aumentar delay: 100ms → 200ms                           │
│         ↓                                                   │
│  3. Retry com backoff exponencial em caso de erro           │
│         ↓                                                   │
│  4. Pausar 3 segundos após 5 erros consecutivos             │
│         ↓                                                   │
│  5. Abortar após 20 erros consecutivos (proteção)           │
└─────────────────────────────────────────────────────────────┘
```

### Parâmetros Otimizados

| Parâmetro | Antes | Depois |
|-----------|-------|--------|
| Batch size | 10 | 50 |
| Delay entre batches | 100ms | 200ms |
| Retry em erro | Nenhum | 3 tentativas |
| Backoff em falha | Nenhum | 1s, 2s, 4s |
| Pausa após erros | Nenhum | 3s após 5 erros |
| Limite de erros | Nenhum | Aborta após 20 |

### Tempo Estimado

- **42.000 operações ÷ 50 = 840 batches**
- **840 × 200ms = 168 segundos (~3 minutos)**
- Muito mais seguro que os 4.200 batches anteriores

---

## Detalhes Técnicos

### Nova Lógica de Retry

```typescript
const BATCH_SIZE = 50;
const BATCH_DELAY = 200;
const MAX_RETRIES = 3;
const MAX_CONSECUTIVE_ERRORS = 20;

let consecutiveErrors = 0;

for (let i = 0; i < batches; i++) {
  let success = false;
  let retries = 0;

  while (!success && retries < MAX_RETRIES) {
    const { error } = await supabase
      .from("trading_operations")
      .insert(batch);

    if (!error) {
      success = true;
      consecutiveErrors = 0;
    } else {
      retries++;
      consecutiveErrors++;
      
      // Backoff exponencial: 1s, 2s, 4s
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries - 1)));
    }
  }

  // Pausa longa se muitos erros
  if (consecutiveErrors >= 5 && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
    await new Promise(r => setTimeout(r, 3000));
  }

  // Abortar se persistir
  if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
    throw new Error("Muitos erros consecutivos. Tente novamente mais tarde.");
  }
}
```

---

## Arquivo a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/components/operations/OperationImport.tsx` | Batch 50, delay 200ms, retry com backoff, limite de erros |

---

## Benefícios

| Métrica | Antes | Depois |
|---------|-------|--------|
| Requisições para 42k | 4.200 | 840 |
| Chance de timeout | Alta | Baixa |
| Recuperação de erros | Nenhuma | Automática |
| Proteção do banco | Nenhuma | Backoff + pause |

