
# Plano: Importacao com Substituicao de Datas Repetidas

## Contexto

O banco possui **75.260 operacoes** em **1.863 datas distintas**. A planilha a ser importada contem ~216k operacoes de Apollo e Orion. Para cada data que existir na planilha E no banco, TODAS as operacoes daquela data (independente da estrategia) serao removidas e substituidas pelos novos dados.

## Abordagem

Modificar o fluxo de importacao existente no `OperationImport.tsx` para adicionar uma etapa de **deteccao e exclusao de duplicatas por data** antes da insercao. Tambem criar uma Edge Function dedicada para a exclusao em lote por datas, pois a exclusao direta pelo client sofre timeouts com dependencias em cascata.

## Etapas da Implementacao

### 1. Nova Edge Function: `delete-operations-by-dates`

Funcao dedicada para excluir operacoes por lista de datas, tratando dependencias:

- Recebe um array de datas e o userId
- Desabilita triggers do usuario temporariamente
- Remove registros dependentes em `notifications` e `ai_classification_logs`
- Deleta todas as operacoes naquelas datas
- Reabilita triggers
- Retorna contagem de registros deletados

Processa em lotes de 50 datas por chamada para evitar timeout.

### 2. Modificar `OperationImport.tsx`

Adicionar checkbox "Substituir datas repetidas" na interface de importacao:

- Quando ativado, apos o parse da planilha e antes da insercao:
  1. Extrai as datas unicas das operacoes importadas
  2. Verifica quais dessas datas ja existem no banco
  3. Mostra ao usuario quantas operacoes serao removidas
  4. Chama a Edge Function para excluir as operacoes das datas duplicadas
  5. Insere os novos dados normalmente

A checkbox vem **ativada por padrao** (pois e o que o usuario pediu agora).

### 3. Fluxo Visual Atualizado

```text
[Upload Planilha]
       |
[Parse + Preview]  <-- Exibe checkbox "Substituir datas repetidas" (marcada)
       |
[Confirmar Importacao]
       |
   [Etapa 1] Detectar datas duplicadas
       |          "Encontradas 150 datas em comum com X operacoes existentes"
       |
   [Etapa 2] Excluir operacoes das datas duplicadas (barra de progresso)
       |          "Removendo operacoes antigas... 3.500 de 8.200"
       |
   [Etapa 3] Inserir novas operacoes (barra de progresso existente)
       |          "Inserindo operacoes... 45.000 de 216.000"
       |
   [Concluido] "8.200 removidas, 216.000 inseridas"
```

## Detalhes Tecnicos

### Edge Function `delete-operations-by-dates`

```text
Entrada: { dates: string[], userId: string }
Processo:
  1. ALTER TABLE trading_operations DISABLE TRIGGER USER
  2. DELETE FROM notifications WHERE operation_id IN (SELECT id FROM trading_operations WHERE operation_date = ANY(dates))
  3. DELETE FROM ai_classification_logs WHERE operation_id IN (SELECT id FROM trading_operations WHERE operation_date = ANY(dates))
  4. DELETE FROM trading_operations WHERE operation_date = ANY(dates) AND user_id = userId
  5. ALTER TABLE trading_operations ENABLE TRIGGER USER
Saida: { deleted: number, success: boolean }
```

Processamento em lotes de 50 datas por chamada para evitar timeout da Edge Function (limite de ~60s).

### Modificacoes no `OperationImport.tsx`

- Novo estado: `replaceMode` (boolean, default true)
- Novo estado: `deletingDuplicates` (boolean)
- Novo estado: `duplicateInfo` ({ dates: number, operations: number } | null)
- Modificar `confirmImport()` para incluir etapa de exclusao antes da insercao
- Adicionar checkbox na UI do preview

### Arquivos Afetados

1. **Novo**: `supabase/functions/delete-operations-by-dates/index.ts` - Edge Function para exclusao em lote
2. **Modificar**: `src/components/operations/OperationImport.tsx` - Adicionar checkbox e logica de substituicao

### Consideracoes de Performance

- Exclusao: ~50 datas por chamada a Edge Function, cada chamada ~2-5s. Para 200 datas = ~20s
- Insercao: 216k operacoes em batches de 100 com 150ms delay = ~5-6 min (fluxo existente ja otimizado)
- Total estimado: ~6-7 minutos para o processo completo (exclusao + insercao)
