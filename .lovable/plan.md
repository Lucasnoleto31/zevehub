
# Plano: Excluir Dados da Estrategia Apollo

## Resumo da Exclusao

Serao excluidas **1.991 operacoes** da tabela `trading_operations`:

| Estrategia | Operacoes | Resultado Total | Periodo |
|------------|-----------|-----------------|---------|
| Apollo | 1.991 | +R$ 3.023,00 | Set/2025 - Jan/2026 |

---

## Acao a Executar

Executar DELETE na tabela `trading_operations` para remover todas as operacoes do Apollo:

```sql
DELETE FROM trading_operations 
WHERE LOWER(strategy) = 'apollo';
```

---

## Aviso Importante

**Esta operacao e IRREVERSIVEL.** Todos os dados historicos de operacoes do Apollo serao permanentemente removidos do banco de dados.

A estrategia "Apollo" permanecera na tabela `strategies` (apenas as operacoes serao excluidas).

---

## Impacto

- Dashboard de operacoes nao mostrara mais dados do Apollo
- Graficos e metricas serao recalculados automaticamente
- StrategyOptimizer nao mostrara mais configuracoes otimizadas para esse robo
