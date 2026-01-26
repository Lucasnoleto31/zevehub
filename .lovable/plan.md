
# Plano: Excluir Dados das Estrategias Ventture, Zeus, Artemis e Pegasus

## Resumo da Exclusao

Serao excluidas **1.867 operacoes** da tabela `trading_operations`:

| Estrategia | Operacoes | Resultado Total | Periodo |
|------------|-----------|-----------------|---------|
| Artemis | 248 | +R$ 2.536,00 | Set/2025 - Nov/2025 |
| Pegasus | 287 | -R$ 8.804,00 | Set/2025 - Nov/2025 |
| Ventture | 425 | +R$ 173.403,00 | Out/2024 - Nov/2025 |
| Zeus | 907 | +R$ 4.214,00 | Set/2025 - Dez/2025 |
| **TOTAL** | **1.867** | **+R$ 171.349,00** | |

---

## Acao a Executar

Executar DELETE na tabela `trading_operations` para remover todas as operacoes dessas estrategias:

```sql
DELETE FROM trading_operations 
WHERE LOWER(strategy) IN ('ventture', 'zeus', 'artemis', 'pegasus');
```

---

## Aviso Importante

**Esta operacao e IRREVERSIVEL.** Todos os dados historicos de operacoes dessas 4 estrategias serao permanentemente removidos do banco de dados.

As estrategias em si permanecerao na tabela `strategies` (apenas as operacoes serao excluidas). Se desejar remover tambem as estrategias da lista, isso pode ser feito em uma acao separada.

---

## Impacto

- Dashboard de operacoes nao mostrara mais dados dessas estrategias
- Graficos e metricas serao recalculados automaticamente
- StrategyOptimizer nao mostrara mais configuracoes otimizadas para esses robos
