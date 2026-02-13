

# Exclusao de Todos os Registros de Operacoes

## Resumo

Excluir todos os 219.111 registros da tabela `trading_operations` do banco de dados.

## Abordagem

Utilizar `TRUNCATE TABLE trading_operations CASCADE` via a ferramenta de migracao do banco de dados. O TRUNCATE e necessario (em vez de DELETE) porque:

- A tabela possui triggers que geram notificacoes para cada exclusao
- DELETE em 219k registros causaria timeout pelo volume de notificacoes em cascata
- TRUNCATE ignora triggers e e instantaneo

## Detalhes Tecnicos

### Comando SQL

```text
TRUNCATE TABLE trading_operations CASCADE;
```

O CASCADE garante que registros dependentes em outras tabelas (como `notifications` e `ai_classification_logs` que referenciam `operation_id`) tambem sejam limpos.

### Tabelas afetadas

- `trading_operations` - 219.111 registros (principal)
- `notifications` - registros vinculados a operacoes
- `ai_classification_logs` - logs de classificacao vinculados

### Impacto

- Acao irreversivel
- Nenhuma alteracao de codigo necessaria
- Os graficos e dashboards ficarao vazios ate novas operacoes serem inseridas

