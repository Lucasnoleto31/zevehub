# 📊 Análise Completa - ZeveBot (Portal Zeve)

**Data:** 2026-02-08  
**Analista:** Clawd (AI Code Review)  
**Escopo:** Performance, Arquitetura, UX, Segurança, Features

---

## 📝 Resumo da Aplicação

O **Portal Zeve** é uma plataforma de gestão para traders de Day Trade no mercado brasileiro (mini índice WIN e mini dólar WDO). Funcionalidades principais:

- **Dashboard** — Visão geral de performance com métricas e gráficos
- **Trading** — Importação de operações do Profit Chart (CSV) com análise
- **Operations** — Sistema de operações de robôs com importação Excel, estratégias e dashboard analítico
- **Finanças** — Controle financeiro pessoal (categorias, lançamentos, metas, orçamento)
- **Gerenciamento de Risco** — Calculadora de mão, payoff e projeção de 6 meses
- **Impostos** — Calculadora de IR Day Trade com compensação de prejuízos e geração de DARF
- **Mensagens** — Sistema de notificações admin → usuário
- **Onboarding/Auth** — Cadastro com trial de 3 dias e controle de acesso

Stack: **React 18 + TypeScript + Supabase + TanStack Query + Recharts + shadcn/ui + Framer Motion**

---

## 🔴 Problemas Críticos de Performance

### 1. Client-Side Batch Fetching (216k+ registros) — CRÍTICO
**Arquivos:** `Dashboard.tsx` (L109-127), `Trading.tsx` (L112-134)

```
while (hasMore) {
  const { data } = await supabase
    .from("profit_operations")
    .select("...")
    .range(from, from + batchSize - 1);
  allOps.push(...data);
}
```

**Problema:** Carrega TODAS as operações do usuário (potencialmente 216k+) para o client em lotes de 1000. Isso causa:
- Múltiplos round-trips ao banco (216+ requests para 216k registros)
- Consumo massivo de memória no browser (~50-100MB para 216k objetos)
- Tempo de carregamento de 30-60 segundos na primeira visita
- Recalcula tudo no client (filtros, agregações, gráficos)

**Impacto:** ⭐⭐⭐⭐⭐ (bloqueante para usuários com muitos dados)

**Solução:** Criar views/RPCs no Supabase que retornem dados já agregados:
- `rpc('get_trading_summary', { user_id, date_from, date_to })` → retorna totais, win rate, payoff
- `rpc('get_daily_results', { user_id, date_from, date_to })` → retorna resultado por dia (para gráficos)
- Nunca trazer operações individuais a não ser para listagem paginada

### 2. Mesmo padrão em OperationsDashboard.tsx — CRÍTICO
**Arquivo:** `OperationsDashboard.tsx` (L113-135)

Mesmo loop `while(hasMore)` para `trading_operations`. Filtro por `ALLOWED_STRATEGIES` é feito no `.in()` do Supabase mas ainda traz tudo para o client.

**Impacto:** ⭐⭐⭐⭐⭐

### 3. Financas.tsx — Arquivo Monstro de 2665 linhas — ALTO
**Arquivo:** `Financas.tsx`

Um único componente com:
- 40+ variáveis de estado (`useState`)
- Toda lógica CRUD inline (categorias, lançamentos, metas, métricas)
- Rendering de dashboard + tabelas + formulários + gráficos + exports
- Importação de Excel inline
- Geração de PDF inline (~100 linhas de jsPDF)

**Problemas:**
- Re-render completo a cada mudança de estado
- Nenhum code splitting — importa jsPDF, XLSX, Recharts sempre
- Impossível de manter ou testar

**Impacto:** ⭐⭐⭐⭐ (performance de rendering + DX)

### 4. TradingDashboard.tsx — 2028 linhas — ALTO
**Arquivo:** `TradingDashboard.tsx`

Recebe `operations` (array de 216k+) como props e faz TODOS os cálculos via `useMemo`:
- Filtra por data, estratégia, ativo
- Calcula win rate, payoff, streaks, curva acumulada
- Gera dados para 6+ gráficos diferentes

Com 216k operações, cada `useMemo` itera o array inteiro. Múltiplos filtros cascateados causam re-cálculos em cadeia.

**Impacto:** ⭐⭐⭐⭐

### 5. QueryClient sem configuração — MÉDIO
**Arquivo:** `App.tsx` (L33)

```ts
const queryClient = new QueryClient();
```

Sem configuração de:
- `staleTime` (default 0 = refetch em toda re-mount)
- `gcTime` / `cacheTime`
- `refetchOnWindowFocus` (default true = refetch toda vez que volta à aba)
- `retry` config

Para dados de 216k registros, refetch a cada troca de aba é devastador.

**Impacto:** ⭐⭐⭐⭐

### 6. Sem Code Splitting / Lazy Loading — MÉDIO
**Arquivo:** `App.tsx` (L13-26)

Todas as 14 páginas são importadas estaticamente. O bundle inicial inclui:
- jsPDF + autoTable (pesado)
- XLSX (pesado)
- Recharts (pesado)
- Framer Motion
- Todos os componentes de todas as páginas

**Impacto:** ⭐⭐⭐ (tempo de carregamento inicial)

### 7. Bulk Delete N+1 — MÉDIO
**Arquivo:** `Financas.tsx` (L376-381)

```ts
for (const id of selectedLancamentos) {
  await supabase.from("lancamentos_financas").delete().eq("id", id);
}
```

Deleta um por um em loop sequencial. Deveria usar `.in("id", selectedLancamentos)`.

**Impacto:** ⭐⭐⭐ (lento para bulk operations)

---

## 🟡 Problemas de Arquitetura

### 8. Autenticação Manual Repetida em Cada Página
**Arquivos:** Dashboard.tsx, Financas.tsx, Trading.tsx, Operations.tsx, GerenciamentoRisco.tsx, Impostos.tsx

Cada página faz seu próprio `checkUser`:
```ts
const { data: { session } } = await supabase.auth.getSession();
if (!session) { navigate("/auth"); return; }
```

E muitas fazem query de roles separada.

**Solução:** Criar um `AuthContext` + `ProtectedRoute` wrapper.

### 9. Sem Tratamento Global de Erros nas Queries
As queries Supabase não têm tratamento consistente. Muitos `if (data) { ... }` sem tratar `error`. Falhas silenciosas.

### 10. Dois Sistemas de Operações Paralelos
- `profit_operations` (importação do Profit Chart, usado em Trading + Dashboard)
- `trading_operations` (importação Excel, usado em Operations)

Tabelas separadas com schemas similares. Duplicação de lógica de importação, dashboard e análise.

### 11. Estado Global Ausente
Sem Context para dados compartilhados (user, profile, roles). Cada página busca independentemente.

---

## 🟠 Melhorias de UX

### 12. Loading sem Feedback Progressivo
Dashboard carrega 216k operações e mostra só um spinner. Sem indicação de progresso ou estimativa.

### 13. Tabela de Operações sem Paginação Real
`Trading.tsx` mostra `operations.slice(0, 50)` mas carrega todas. Deveria ter paginação server-side.

### 14. Financas — Muitas Tabs, Interface Sobrecarregada
6 tabs numa única página. Dashboard financeiro poderia ser separado da gestão de lançamentos.

### 15. Falta Busca/Filtro em Listas
Lançamentos financeiros e operações não têm busca por texto.

### 16. Responsividade nos Gráficos
Gráficos de Recharts com altura fixa (`h-[350px]`) podem não funcionar bem em mobile.

### 17. Trial Expiration Check no Client
`Dashboard.tsx` verifica se trial expirou E faz UPDATE no client. Isso deveria ser uma Edge Function ou trigger no banco.

---

## 🔒 Segurança

### 18. Trial Bypass Possível — ALTO
**Arquivo:** `Dashboard.tsx` (L83-100)

A verificação de trial e o bloqueio são feitos no client. Um usuário pode:
1. Interceptar o request e não executar o UPDATE
2. Modificar o estado local para `accessStatus = "aprovado"`

**Solução:** RLS policy que nega acesso quando `trial_expires_at < now()`.

### 19. Sem RLS Verificável no Client
O código não mostra evidência de RLS forte. Queries como:
```ts
.from("profit_operations").delete().eq("user_id", userId)
```
Dependem do client enviar o `user_id` correto. Se RLS não filtrar por `auth.uid()`, qualquer usuário autenticado pode deletar dados de outros.

### 20. Supabase Anon Key Exposta
Normal para Supabase, mas reforça a necessidade de RLS em TODAS as tabelas.

### 21. Admin Check no Client
```ts
const { data: adminRole } = await supabase
  .from("user_roles").select("*").eq("role", "admin");
setIsAdmin(!!adminRole);
```
Funções admin deveriam ser protegidas por RLS/Edge Functions, não por UI hiding.

---

## 💡 Features que Adicionariam Valor

1. **Comparativo de Estratégias** — Side-by-side de performance entre estratégias
2. **Alertas de Risco em Tempo Real** — WebSocket para notificar quando atingir stop diário
3. **Diário de Trading** — Notas por dia/operação, screenshots, análise pós-trade
4. **Backtesting Simulator** — Aplicar parâmetros de risco em dados históricos
5. **Export Declaração IR Anual** — Gerar relatório consolidado para IRPF
6. **Multi-conta** — Suporte a múltiplas corretoras/contas
7. **Dashboard Compartilhável** — Link público com performance (para assessoria)
8. **PWA Offline** — Service Worker já está registrado mas sem cache de dados

---

## 🎯 Plano de Ação Priorizado

### Quick Wins (1-2 dias cada)

| # | Ação | Arquivo | Impacto |
|---|------|---------|---------|
| 1 | Configurar QueryClient (staleTime: 5min, refetchOnWindowFocus: false) | `App.tsx` | ⭐⭐⭐⭐ |
| 2 | Lazy loading de rotas (`React.lazy` + `Suspense`) | `App.tsx` | ⭐⭐⭐ |
| 3 | Corrigir bulk delete para usar `.in()` | `Financas.tsx` | ⭐⭐⭐ |
| 4 | Criar `AuthContext` + `ProtectedRoute` | Novo arquivo | ⭐⭐⭐ |
| 5 | Mover verificação de trial para RLS/trigger | Supabase | ⭐⭐⭐⭐ |

### Refactors Médios (3-5 dias cada)

| # | Ação | Impacto |
|---|------|---------|
| 6 | Criar RPCs no Supabase para agregações de operações (`get_trading_summary`, `get_daily_results`) | ⭐⭐⭐⭐⭐ |
| 7 | Quebrar `Financas.tsx` em 6+ componentes (DashboardFinanceiro, CategoriaManager, LancamentoManager, MetaManager, ConfigFinanceira, ExportFinanceiro) | ⭐⭐⭐⭐ |
| 8 | Quebrar `TradingDashboard.tsx` em componentes menores com dados já agregados | ⭐⭐⭐⭐ |
| 9 | Implementar paginação server-side nas tabelas de operações | ⭐⭐⭐⭐ |
| 10 | Unificar tabelas `profit_operations` e `trading_operations` ou criar views compartilhadas | ⭐⭐⭐ |

### Refactors Grandes (1-2 semanas)

| # | Ação | Impacto |
|---|------|---------|
| 11 | Migrar toda lógica de agregação para Supabase (views materializadas ou Edge Functions) | ⭐⭐⭐⭐⭐ |
| 12 | Implementar sistema de cache com invalidação inteligente (mutações invalidam queries específicas) | ⭐⭐⭐⭐ |
| 13 | Adicionar índices no Supabase (user_id + open_time, user_id + strategy, user_id + operation_date) | ⭐⭐⭐⭐ |

---

## 📊 Estimativa de Impacto

| Métrica | Atual (estimado) | Após Quick Wins | Após Refactors |
|---------|-----------------|-----------------|----------------|
| First Load (bundle) | ~3-5MB | ~1-2MB | ~800KB |
| Dashboard Load (216k ops) | 30-60s | 30-60s | <2s |
| Memória (Dashboard) | ~100MB | ~100MB | <10MB |
| Re-renders desnecessários | Constantes | Reduzidos 50% | Mínimos |
| Requests ao Supabase | 216+/page | 216+ (cached) | 3-5/page |

**A maior vitória é o item #6 (RPCs no Supabase).** Sozinho, resolve 80% dos problemas de performance transformando 216+ requests + 100MB de dados client-side em 3-5 requests retornando <10KB de dados agregados.

---

## 🔍 Padrões Encontrados (mesmos do Zeveia)

✅ **Confirmado:** Os mesmos anti-patterns do projeto Zeveia estão presentes:
1. Client-side batch fetching com loop while
2. Agregações pesadas no frontend (useMemo com arrays enormes)  
3. Componentes monolíticos (2000+ linhas)
4. Sem code splitting
5. Sem paginação server-side
6. Auth check manual em cada página

A arquitetura é funcional mas não escala. Com o crescimento dos dados, a experiência degrada rapidamente.
