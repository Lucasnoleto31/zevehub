
# Plano: Substituir Dados do Apollo

## Dados da Planilha

| Campo | Exemplo |
|-------|---------|
| data_operacao | 2024.12.12 16:38:04 |
| ativo | WIN |
| contratos | 1 |
| resultado | -711 |
| estrategia | Apolo |

**Total de registros:** ~18.350 operações

---

## Estratégia de Implementação

### Problema
O banco de dados tem timeout rigoroso que impede exclusões diretas via SQL.

### Solução
Criar uma **Edge Function dedicada** que:
1. Deleta os dados antigos do Apollo (1 por vez com retry)
2. Insere os novos dados em lotes pequenos

---

## Alterações Técnicas

### 1. Nova Edge Function: `replace-apollo-data`

```typescript
// supabase/functions/replace-apollo-data/index.ts
// - Recebe os dados da planilha via POST
// - Deleta registros antigos do Apollo um a um
// - Insere novos registros em lotes de 50
// - Retorna progresso e resultado final
```

### 2. Componente de Importação Temporário

Adicionar lógica no frontend para:
- Ler a planilha Excel
- Enviar dados para a Edge Function
- Mostrar progresso da operação

---

## Fluxo de Execução

```text
┌─────────────────┐
│ Ler Planilha    │
│ (18.350 linhas) │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Edge Function   │
│ replace-apollo  │
└────────┬────────┘
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Deletar antigos │ ──► │ Inserir novos   │
│ (1 por vez)     │     │ (lotes de 50)   │
└─────────────────┘     └─────────────────┘
```

---

## Mapeamento de Campos

| Planilha | Banco de Dados |
|----------|----------------|
| data_operacao | operation_date |
| horario | operation_time |
| ativo | asset |
| contratos | contracts |
| custos | costs |
| resultado | result |
| observacoes | notes |
| estrategia | strategy |

---

## Resultado Esperado

- ✅ Todas as operações antigas do Apollo removidas
- ✅ ~18.350 novas operações importadas
- ✅ Dashboard atualizado automaticamente
