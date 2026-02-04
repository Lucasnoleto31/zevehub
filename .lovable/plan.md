

# Plano: Limpar Todo o Banco de Dados do Zeve Hub

## Escopo

Exclusão **permanente e irreversível** de todos os dados de todas as tabelas do sistema.

---

## Tabelas a Serem Limpas

### Dados de Usuários
- `profiles` - Perfis de usuários
- `user_roles` - Funções/papéis
- `user_permissions` - Permissões
- `user_badges` / `badge_progress` - Conquistas
- `access_logs` / `access_sync_logs` - Logs de acesso
- `activity_logs` - Registros de atividade

### Trading/Operações
- `trading_operations` - Operações de trading
- `profit_operations` - Operações de lucro
- `journal_trades` - Diário de trades
- `strategies` - Estratégias
- `ai_classification_logs` - Logs de IA
- `opportunities` - Oportunidades

### Finanças Pessoais
- `personal_finances` - Transações
- `financial_accounts` - Contas
- `finance_categories` / `categorias_financas` - Categorias
- `lancamentos_financas` - Lançamentos
- `metas_financeiras` - Metas
- `category_budgets` - Orçamentos
- `recurring_transactions` - Recorrências
- `account_transfers` - Transferências
- `usuario_metricas_financas` - Métricas

### Comunidade
- `community_posts` - Posts
- `community_comments` - Comentários
- `comment_likes` - Curtidas em comentários
- `post_reactions` - Reações
- `post_mentions` - Menções
- `post_reports` - Denúncias
- `user_community_titles` - Títulos

### Sistema
- `messages` / `notifications` / `user_notifications` - Notificações
- `client_bots` - Robôs
- `contracts` - Contratos
- `registered_clients` - Clientes
- `economic_events` - Eventos econômicos
- `risk_management_settings` - Configurações de risco

---

## Estratégia de Exclusão

### Problema
- RLS (Row Level Security) bloqueia exclusões diretas
- Foreign Keys exigem ordem específica de exclusão
- Timeouts do banco impedem DELETE em massa

### Solução
Criar uma **Edge Function** com `service_role` key que:
1. Desabilita temporariamente constraints
2. Exclui tabelas na ordem correta (filhas antes das pais)
3. Processa em lotes pequenos para evitar timeout

---

## Ordem de Exclusão (Respeitando Foreign Keys)

```text
1. Tabelas dependentes (filhas)
   ├── comment_likes
   ├── post_reactions
   ├── post_mentions
   ├── post_reports
   ├── community_comments
   ├── ai_classification_logs
   └── notifications

2. Tabelas intermediárias
   ├── community_posts
   ├── trading_operations
   ├── profit_operations
   ├── journal_trades
   ├── personal_finances
   └── lancamentos_financas

3. Tabelas de referência
   ├── strategies
   ├── financial_accounts
   ├── categorias_financas
   └── ...

4. Tabelas principais
   ├── user_roles
   ├── user_permissions
   └── profiles (por último)
```

---

## Implementação

### 1. Edge Function: `clear-all-data`
- Usa `service_role` key para bypass de RLS
- Executa TRUNCATE ou DELETE em cascata
- Retorna status de cada tabela

### 2. Componente Frontend
- Botão com confirmação tripla
- Barra de progresso por tabela
- Log de exclusão em tempo real

---

## Avisos Importantes

- **Esta ação é IRREVERSÍVEL**
- Todos os usuários perderão acesso
- Histórico de operações será perdido permanentemente
- Dados financeiros serão apagados
- Comunidade será resetada

