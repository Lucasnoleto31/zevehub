

# Remover Cards de Analise do Calendario

## Resumo

Remover os dois cards "Recuperacao Apos Perdas" e "Padroes de Sequencia" do componente `PerformanceCalendar.tsx`, junto com toda a logica de calculo associada.

## Detalhes Tecnicos

### Arquivo: `src/components/dashboard/PerformanceCalendar.tsx`

**Remover logica de calculo (linhas 80-151):**
- Bloco `recoveryStats`: calculo de recuperacao apos perdas (linhas 80-96)
- Bloco `streakPatterns`: calculo de padroes de sequencia (linhas 98-151)
- Simplificar o retorno do `useMemo` para retornar apenas `calendarDays` e `monthStats`

**Remover cards do JSX (linhas 313-394):**
- Card "Recuperacao Apos Perdas" (linhas 316-350)
- Card "Padroes de Sequencia" (linhas 352-393)
- Container grid que envolve ambos (linhas 314-394)

**Remover imports nao utilizados:**
- `Activity` e `TrendingUp` de lucide-react (se nao forem usados em outro lugar do componente)

**Remover destructuring:**
- Atualizar a linha de destructuring do `useMemo` para remover `recoveryStats` e `streakPatterns`

Nenhum arquivo novo sera criado. Apenas limpeza de codigo existente.

