import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { BarChart2 } from "lucide-react";

import RobosHero from "./RobosHero";
import RobosFilters from "./RobosFilters";
import RobosQuickStats from "./RobosQuickStats";
import RobosCharts from "./RobosCharts";
import RobosStrategyCards from "./RobosStrategyCards";

import PerformanceHeatmap from "@/components/dashboard/PerformanceHeatmap";
import TopPerformanceDays from "@/components/dashboard/TopPerformanceDays";
import AdvancedMetrics from "@/components/dashboard/AdvancedMetrics";
import PerformanceCalendar from "@/components/dashboard/PerformanceCalendar";

interface OperationsDashboardProps {
  userId: string;
}

interface Operation {
  operation_date: string;
  operation_time: string;
  result: number;
  strategy: string | null;
  contracts: number;
}

interface Stats {
  totalOperations: number;
  positiveDays: number;
  negativeDays: number;
  winRate: number;
  totalResult: number;
  bestResult: number;
  worstResult: number;
  positiveStreak: number;
  negativeStreak: number;
  payoff: number;
  averageWin: number;
  averageLoss: number;
  positiveMonths: number;
  negativeMonths: number;
  monthlyConsistency: number;
  averageMonthlyResult: number;
  volatility: number;
  standardDeviation: number;
}

// Estratégias permitidas no dashboard de Robôs (whitelist)
const ALLOWED_STRATEGIES = ['Alaska & Square', 'Apollo', 'Ares', 'Orion'];
const ALLOWED_STRATEGIES_LOWER = ALLOWED_STRATEGIES.map(s => s.toLowerCase());

const EMPTY_STATS: Stats = {
  totalOperations: 0,
  positiveDays: 0,
  negativeDays: 0,
  winRate: 0,
  totalResult: 0,
  bestResult: 0,
  worstResult: 0,
  positiveStreak: 0,
  negativeStreak: 0,
  payoff: 0,
  averageWin: 0,
  averageLoss: 0,
  positiveMonths: 0,
  negativeMonths: 0,
  monthlyConsistency: 0,
  averageMonthlyResult: 0,
  volatility: 0,
  standardDeviation: 0,
};

const OperationsDashboard = ({ userId }: OperationsDashboardProps) => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [filteredOperations, setFilteredOperations] = useState<Operation[]>([]);
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [strategyFilter, setStrategyFilter] = useState<string[]>([]);
  const [availableStrategies, setAvailableStrategies] = useState<string[]>([]);
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [hourFilter, setHourFilter] = useState<string[]>([]);
  const [weekdayFilter, setWeekdayFilter] = useState<string[]>([]);
  const [monthFilter, setMonthFilter] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [performanceCurve, setPerformanceCurve] = useState<any[]>([]);
  const [monthStats, setMonthStats] = useState<any[]>([]);
  const [hourDistribution, setHourDistribution] = useState<any[]>([]);
  const [yearlyStats, setYearlyStats] = useState<any[]>([]);
  const [strategyStats, setStrategyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOps, setLoadingOps] = useState(true);
  const [rpcData, setRpcData] = useState<any>(null);

  useEffect(() => {
    loadOperations();
  }, [userId]);

  useEffect(() => {
    applyDateFilter();
  }, [operations, dateFilter, strategyFilter, customStartDate, customEndDate, hourFilter, weekdayFilter, monthFilter]);

  useEffect(() => {
    // When no date/strategy filter is active and we have RPC data, use it for main stats
    if (rpcData && dateFilter === "all" && strategyFilter.length === 0 && hourFilter.length === 0 && weekdayFilter.length === 0 && monthFilter.length === 0) {
      applyRPCStats(rpcData);
    } else if (filteredOperations.length > 0) {
      calculateStats(filteredOperations);
      generateCharts(filteredOperations);
    }
  }, [filteredOperations, rpcData, dateFilter, strategyFilter, hourFilter, weekdayFilter, monthFilter]);

  const applyRPCStats = (rpc: any) => {
    const dr = rpc.dailyResults || [];
    const dailyResultsArray = dr.map((d: any) => d.result);
    const positiveDays = dailyResultsArray.filter((r: number) => r > 0).length;
    const negativeDays = dailyResultsArray.filter((r: number) => r < 0).length;
    const totalDays = dr.length;
    const winRate = totalDays > 0 ? (positiveDays / totalDays) * 100 : 0;

    const avgWin = rpc.totalWins > 0 ? rpc.totalProfit / rpc.totalWins : 0;
    const avgLoss = rpc.totalLosses > 0 ? Math.abs(rpc.totalLoss) / rpc.totalLosses : 0;
    const payoff = avgLoss > 0 ? avgWin / avgLoss : 0;

    const mr = rpc.monthlyResults || [];
    const monthlyResultsArray = mr.map((m: any) => m.result);
    const positiveMonths = monthlyResultsArray.filter((r: number) => r > 0).length;
    const negativeMonths = monthlyResultsArray.filter((r: number) => r < 0).length;
    const monthlyConsistency = mr.length > 0 ? (positiveMonths / mr.length) * 100 : 0;
    const averageMonthlyResult = mr.length > 0 ? monthlyResultsArray.reduce((s: number, r: number) => s + r, 0) / mr.length : 0;

    const avgDaily = totalDays > 0 ? dailyResultsArray.reduce((s: number, r: number) => s + r, 0) / totalDays : 0;
    let varianceSum = 0;
    for (const r of dailyResultsArray) varianceSum += (r - avgDaily) ** 2;
    const standardDeviation = totalDays > 0 ? Math.sqrt(varianceSum / totalDays) : 0;
    const volatility = avgDaily !== 0 ? (standardDeviation / Math.abs(avgDaily)) * 100 : 0;

    // Streaks
    const sorted = [...dr].sort((a: any, b: any) => a.date.localeCompare(b.date));
    let maxPos = 0, maxNeg = 0, curPos = 0, curNeg = 0;
    for (const d of sorted) {
      if (d.result > 0) { curPos++; curNeg = 0; if (curPos > maxPos) maxPos = curPos; }
      else if (d.result < 0) { curNeg++; curPos = 0; if (curNeg > maxNeg) maxNeg = curNeg; }
    }

    setStats({
      totalOperations: rpc.totalOperations,
      positiveDays,
      negativeDays,
      winRate,
      totalResult: rpc.netResult,
      bestResult: rpc.bestDay?.result || 0,
      worstResult: rpc.worstDay?.result || 0,
      positiveStreak: maxPos,
      negativeStreak: maxNeg,
      payoff,
      averageWin: avgWin,
      averageLoss: avgLoss,
      positiveMonths,
      negativeMonths,
      monthlyConsistency,
      averageMonthlyResult,
      volatility,
      standardDeviation,
    });

    // Generate charts from RPC data
    generateChartsFromRPC(rpc);
  };

  const generateChartsFromRPC = (rpc: any) => {
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const dr = rpc.dailyResults || [];
    const mr = rpc.monthlyResults || [];
    const bh = rpc.byHour || [];
    const bs = rpc.byStrategy || [];

    // Performance curve
    let accumulated = 0;
    const sorted = [...dr].sort((a: any, b: any) => a.date.localeCompare(b.date));
    const curve = sorted.map((d: any) => {
      accumulated += d.result;
      const [, mm, dd] = d.date.split('-');
      return { date: `${dd}/${mm}`, value: accumulated };
    });
    setPerformanceCurve(curve.length > 365 ? curve.filter((_: any, i: number) => i % Math.ceil(curve.length / 365) === 0 || i === curve.length - 1) : curve);

    // Month stats
    const monthlyMap: Record<string, number> = {};
    mr.forEach((m: any) => {
      const idx = parseInt(m.month.split('-')[1], 10) - 1;
      monthlyMap[monthNames[idx]] = (monthlyMap[monthNames[idx]] || 0) + m.result;
    });
    setMonthStats(monthNames.map(month => ({ month, result: monthlyMap[month] || 0 })));

    // Hour distribution
    const hourDist = bh.map((h: any) => ({
      hour: `${h.hour}h`,
      operacoes: h.operations,
      positivas: h.wins,
      negativas: h.operations - h.wins,
      winRate: h.operations > 0 ? (h.wins / h.operations) * 100 : 0,
      resultado: h.result,
    })).sort((a: any, b: any) => parseInt(a.hour) - parseInt(b.hour));
    setHourDistribution(hourDist);

    // Yearly stats
    const yearAgg: Record<string, number> = {};
    mr.forEach((m: any) => {
      const year = m.month.substring(0, 4);
      yearAgg[year] = (yearAgg[year] || 0) + m.result;
    });
    setYearlyStats(Object.entries(yearAgg).sort(([a], [b]) => a.localeCompare(b)).map(([year, result]) => ({ year, result })));

    // Strategy stats from RPC
    const strategyStatsArray = bs.map((s: any) => {
      const losses = s.operations - s.wins;
      const winRate = s.operations > 0 ? (s.wins / s.operations) * 100 : 0;
      return {
        strategy: s.strategy || 'Sem Estratégia',
        totalOps: s.operations,
        totalResult: s.result,
        winRate,
        payoff: 0, // not available from RPC aggregate
        averageWin: 0,
        averageLoss: 0,
        maxDrawdown: 0,
        positive: s.wins,
        negative: losses,
      };
    }).sort((a: any, b: any) => b.totalResult - a.totalResult);
    setStrategyStats(strategyStatsArray);
  };

  // Fetch via RPC instead of batch loading all operations
  const loadOperations = async () => {
    try {
      // Use RPC for aggregated data (with fallback)
      try {
        const { data: rpc, error: rpcError } = await supabase.rpc('get_operations_dashboard', {
          p_user_id: userId,
          p_date_from: null,
          p_date_to: null,
        });
        if (!rpcError && rpc) setRpcData(rpc);
      } catch (rpcErr) {
        console.warn("RPC fallback - using client-side aggregation:", rpcErr);
      }

      // Stats are ready — stop showing main spinner
      setLoading(false);
      setAvailableStrategies([...ALLOWED_STRATEGIES].sort());

      // Fetch aggregated detail for sub-components via RPC
      try {
        const { data: detailData, error: detailError } = await supabase.rpc('get_operations_detail', {
          p_user_id: userId,
        });

        if (!detailError && detailData) {
          const syntheticOps: Operation[] = [];
          const byDay = detailData.byDay || [];
          const byDowHour = detailData.byDowHour || [];
          const byStrategyDay = detailData.byStrategyDay || [];

          // Build date-to-dow lookup
          const datesByDow: Record<number, string> = {};
          for (const d of byDay) {
            const date = new Date(d.date + 'T12:00:00');
            const dow = date.getDay();
            if (!datesByDow[dow]) datesByDow[dow] = d.date;
          }

          // 1 op per strategy per day (for AdvancedMetrics + Calendar + TopDays)
          // ~500-1000 entries instead of 130k
          for (const sd of byStrategyDay) {
            syntheticOps.push({
              operation_date: sd.date,
              operation_time: '10:00:00',
              result: sd.result,
              strategy: sd.strategy,
              contracts: sd.operations,
            });
          }

          // 1 op per dow×hour cell (for Heatmap) — ~50-100 entries
          for (const cell of byDowHour) {
            const date = datesByDow[cell.dayOfWeek];
            if (!date) continue;
            const hours = String(cell.hour).padStart(2, '0');
            syntheticOps.push({
              operation_date: date,
              operation_time: `${hours}:00:00`,
              result: cell.result,
              strategy: null,
              contracts: cell.operations,
            });
          }

          setOperations(syntheticOps);
          setLoadingOps(false);
        } else {
          throw new Error('RPC failed');
        }
      } catch (detailErr) {
        console.warn("Detail RPC failed, falling back to batch fetch:", detailErr);
        // Fallback: batch fetch
        const batchSize = 1000;
        let allOps: Operation[] = [];
        let from = 0;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from("trading_operations")
            .select("operation_date, operation_time, result, strategy, contracts")
            .eq("user_id", userId)
            .in("strategy", ALLOWED_STRATEGIES)
            .order("operation_date", { ascending: true })
            .range(from, from + batchSize - 1);
          if (error) break;
          if (data && data.length > 0) { allOps = allOps.concat(data); from += batchSize; hasMore = data.length === batchSize; }
          else hasMore = false;
        }
        setOperations(allOps);
        setLoadingOps(false);
      }

    } catch (error) {
      console.error("Erro ao carregar operações:", error);
    } finally {
      setLoading(false);
      setLoadingOps(false);
    }
  };

  const applyDateFilter = () => {
    if (operations.length === 0) {
      setFilteredOperations([]);
      return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Já vem filtrado do banco, mas mantemos o filtro local para segurança
    let filtered = operations.filter(op => 
      op.strategy && ALLOWED_STRATEGIES_LOWER.includes(op.strategy.toLowerCase())
    );

    switch (dateFilter) {
      case "today":
        filtered = filtered.filter(op => {
          const [year, month, day] = op.operation_date.split('-').map(Number);
          const opDate = new Date(year, month - 1, day);
          opDate.setHours(0, 0, 0, 0);
          return opDate.getTime() === now.getTime();
        });
        break;
      
      case "7days": {
        const last7Days = new Date(now);
        last7Days.setDate(last7Days.getDate() - 7);
        filtered = filtered.filter(op => {
          const [year, month, day] = op.operation_date.split('-').map(Number);
          const opDate = new Date(year, month - 1, day);
          opDate.setHours(0, 0, 0, 0);
          return opDate >= last7Days;
        });
        break;
      }
      
      case "30days": {
        const last30Days = new Date(now);
        last30Days.setDate(last30Days.getDate() - 30);
        filtered = filtered.filter(op => {
          const [year, month, day] = op.operation_date.split('-').map(Number);
          const opDate = new Date(year, month - 1, day);
          opDate.setHours(0, 0, 0, 0);
          return opDate >= last30Days;
        });
        break;
      }
      
      case "currentMonth": {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        filtered = filtered.filter(op => {
          const [year, month, day] = op.operation_date.split('-').map(Number);
          const opDate = new Date(year, month - 1, day);
          opDate.setHours(0, 0, 0, 0);
          return opDate >= startOfMonth;
        });
        break;
      }
      
      case "currentYear": {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        startOfYear.setHours(0, 0, 0, 0);
        filtered = filtered.filter(op => {
          const [year, month, day] = op.operation_date.split('-').map(Number);
          const opDate = new Date(year, month - 1, day);
          opDate.setHours(0, 0, 0, 0);
          return opDate >= startOfYear;
        });
        break;
      }
      
      case "custom":
        if (customStartDate || customEndDate) {
          filtered = filtered.filter(op => {
            const [year, month, day] = op.operation_date.split('-').map(Number);
            const opDate = new Date(year, month - 1, day);
            opDate.setHours(0, 0, 0, 0);
            
            if (customStartDate && customEndDate) {
              const start = new Date(customStartDate);
              const end = new Date(customEndDate);
              start.setHours(0, 0, 0, 0);
              end.setHours(0, 0, 0, 0);
              return opDate >= start && opDate <= end;
            } else if (customStartDate) {
              const start = new Date(customStartDate);
              start.setHours(0, 0, 0, 0);
              return opDate >= start;
            } else if (customEndDate) {
              const end = new Date(customEndDate);
              end.setHours(0, 0, 0, 0);
              return opDate <= end;
            }
            return true;
          });
        }
        break;
      
      default:
        break;
    }

    if (strategyFilter.length > 0) {
      filtered = filtered.filter(op => 
        op.strategy && strategyFilter.includes(op.strategy)
      );
    }

    if (hourFilter.length > 0) {
      filtered = filtered.filter(op => {
        const hour = parseInt(op.operation_time.split(":")[0]);
        return hourFilter.includes(hour.toString());
      });
    }

    if (weekdayFilter.length > 0) {
      filtered = filtered.filter(op => {
        const [year, month, day] = op.operation_date.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        return weekdayFilter.includes(dayOfWeek.toString());
      });
    }

    if (monthFilter.length > 0) {
      filtered = filtered.filter(op => {
        const month = parseInt(op.operation_date.split('-')[1], 10) - 1;
        return monthFilter.includes(month.toString());
      });
    }

    setFilteredOperations(filtered);
  };

  // FASE 2: Single-pass calculateStats — sem risco de stack overflow
  const calculateStats = (ops: Operation[]) => {
    if (ops.length === 0) {
      setStats(EMPTY_STATS);
      return;
    }

    // Single-pass: calcula tudo em uma iteração
    let totalResult = 0;
    let bestResult = -Infinity;
    let worstResult = Infinity;
    let winCount = 0;
    let lossCount = 0;
    let winSum = 0;
    let lossAbsSum = 0;

    const dailyResults: Record<string, number> = {};
    const monthlyResults: Record<string, number> = {};

    for (let i = 0; i < ops.length; i++) {
      const result = Number(ops[i].result);
      const date = ops[i].operation_date;

      totalResult += result;
      if (result > bestResult) bestResult = result;
      if (result < worstResult) worstResult = result;

      if (result > 0) {
        winCount++;
        winSum += result;
      } else if (result < 0) {
        lossCount++;
        lossAbsSum += Math.abs(result);
      }

      // Daily aggregation
      dailyResults[date] = (dailyResults[date] || 0) + result;

      // Monthly aggregation
      const monthKey = date.substring(0, 7); // "YYYY-MM"
      monthlyResults[monthKey] = (monthlyResults[monthKey] || 0) + result;
    }

    const dailyResultsArray = Object.values(dailyResults);
    const positiveDays = dailyResultsArray.filter(r => r > 0).length;
    const negativeDays = dailyResultsArray.filter(r => r < 0).length;
    const totalDays = dailyResultsArray.length;
    const winRate = totalDays > 0 ? (positiveDays / totalDays) * 100 : 0;

    const averageWin = winCount > 0 ? winSum / winCount : 0;
    const averageLoss = lossCount > 0 ? lossAbsSum / lossCount : 0;
    const payoff = averageLoss > 0 ? averageWin / averageLoss : 0;

    const monthlyResultsArray = Object.values(monthlyResults);
    const positiveMonths = monthlyResultsArray.filter(r => r > 0).length;
    const negativeMonths = monthlyResultsArray.filter(r => r < 0).length;
    const monthlyConsistency = monthlyResultsArray.length > 0
      ? (positiveMonths / monthlyResultsArray.length) * 100
      : 0;
    const averageMonthlyResult = monthlyResultsArray.length > 0
      ? monthlyResultsArray.reduce((sum, r) => sum + r, 0) / monthlyResultsArray.length
      : 0;

    // Volatility & standard deviation (over daily results)
    const avgDailyResult = totalDays > 0
      ? dailyResultsArray.reduce((sum, r) => sum + r, 0) / totalDays
      : 0;
    let varianceSum = 0;
    for (let i = 0; i < dailyResultsArray.length; i++) {
      varianceSum += (dailyResultsArray[i] - avgDailyResult) ** 2;
    }
    const standardDeviation = totalDays > 0 ? Math.sqrt(varianceSum / totalDays) : 0;
    const volatility = avgDailyResult !== 0 ? (standardDeviation / Math.abs(avgDailyResult)) * 100 : 0;

    // Streaks (over sorted daily results)
    let maxPositiveStreak = 0;
    let maxNegativeStreak = 0;
    let currentPositiveStreak = 0;
    let currentNegativeStreak = 0;

    // Sort daily results by date for correct streak calculation
    const sortedDailyEntries = Object.entries(dailyResults).sort(([a], [b]) => a.localeCompare(b));
    for (const [, result] of sortedDailyEntries) {
      if (result > 0) {
        currentPositiveStreak++;
        currentNegativeStreak = 0;
        if (currentPositiveStreak > maxPositiveStreak) maxPositiveStreak = currentPositiveStreak;
      } else if (result < 0) {
        currentNegativeStreak++;
        currentPositiveStreak = 0;
        if (currentNegativeStreak > maxNegativeStreak) maxNegativeStreak = currentNegativeStreak;
      }
    }

    setStats({
      totalOperations: ops.length,
      positiveDays,
      negativeDays,
      winRate,
      totalResult,
      bestResult: bestResult === -Infinity ? 0 : bestResult,
      worstResult: worstResult === Infinity ? 0 : worstResult,
      positiveStreak: maxPositiveStreak,
      negativeStreak: maxNegativeStreak,
      payoff,
      averageWin,
      averageLoss,
      positiveMonths,
      negativeMonths,
      monthlyConsistency,
      averageMonthlyResult,
      volatility,
      standardDeviation,
    });
  };

  // Intelligent sampling for large datasets
  const sampleData = <T,>(data: T[], maxPoints: number = 365): T[] => {
    if (data.length <= maxPoints) return data;
    const step = Math.ceil(data.length / maxPoints);
    return data.filter((_, i) => i % step === 0 || i === data.length - 1);
  };

  // FASE 3 + 4: Single-pass generateCharts com drawdown incremental
  const generateCharts = (ops: Operation[]) => {
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    // Aggregation buckets
    const daily: Record<string, number> = {};
    const monthly: Record<string, number> = {};
    const hourly: Record<number, { total: number; positive: number; negative: number; totalResult: number }> = {};
    const yearly: Record<string, number> = {};

    // Strategy stats with incremental drawdown (FASE 4)
    const strategyAgg: Record<string, {
      totalOps: number;
      positive: number;
      negative: number;
      totalResult: number;
      wins: number;
      losses: number;
      totalWinAmount: number;
      totalLossAmount: number;
      accumulated: number;
      peak: number;
      maxDrawdown: number;
    }> = {};

    // Single loop over all operations
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const result = Number(op.result);
      const date = op.operation_date;
      const strategy = op.strategy || 'Sem Estratégia';

      // Daily
      daily[date] = (daily[date] || 0) + result;

      // Monthly by month name (for chart)
      const monthIndex = parseInt(date.split('-')[1], 10) - 1;
      const monthName = monthNames[monthIndex];
      monthly[monthName] = (monthly[monthName] || 0) + result;

      // Hourly
      const hour = parseInt(op.operation_time.split(":")[0]);
      if (!hourly[hour]) {
        hourly[hour] = { total: 0, positive: 0, negative: 0, totalResult: 0 };
      }
      hourly[hour].total++;
      hourly[hour].totalResult += result;
      if (result > 0) hourly[hour].positive++;
      else if (result < 0) hourly[hour].negative++;

      // Yearly
      const year = date.substring(0, 4);
      yearly[year] = (yearly[year] || 0) + result;

      // Strategy with incremental drawdown
      if (!strategyAgg[strategy]) {
        strategyAgg[strategy] = {
          totalOps: 0, positive: 0, negative: 0,
          totalResult: 0, wins: 0, losses: 0,
          totalWinAmount: 0, totalLossAmount: 0,
          accumulated: 0, peak: 0, maxDrawdown: 0,
        };
      }
      const s = strategyAgg[strategy];
      s.totalOps++;
      s.totalResult += result;
      if (result > 0) {
        s.positive++;
        s.wins++;
        s.totalWinAmount += result;
      } else if (result < 0) {
        s.negative++;
        s.losses++;
        s.totalLossAmount += Math.abs(result);
      }
      // Incremental drawdown
      s.accumulated += result;
      if (s.accumulated > s.peak) s.peak = s.accumulated;
      const drawdown = s.peak - s.accumulated;
      if (drawdown > s.maxDrawdown) s.maxDrawdown = drawdown;
    }

    // --- Build output arrays ---

    // Performance curve (equity)
    let accumulated = 0;
    const curve = Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, result]) => {
        accumulated += result;
        const [, mm, dd] = date.split('-');
        return { date: `${dd}/${mm}`, value: accumulated };
      });
    setPerformanceCurve(sampleData(curve, 365));

    // Month stats
    setMonthStats(monthNames.map(month => ({
      month,
      result: monthly[month] || 0,
    })));

    // Hour distribution
    const hourDistArray = Object.entries(hourly)
      .map(([hour, data]) => ({
        hour: `${hour}h`,
        operacoes: data.total,
        positivas: data.positive,
        negativas: data.negative,
        winRate: data.total > 0 ? (data.positive / data.total) * 100 : 0,
        resultado: data.totalResult,
      }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
    setHourDistribution(hourDistArray);

    // Yearly stats
    setYearlyStats(
      Object.entries(yearly)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([year, result]) => ({ year, result }))
    );

    // Strategy stats
    const strategyStatsArray = Object.entries(strategyAgg).map(([strategy, data]) => {
      const winRate = data.totalOps > 0 ? (data.wins / data.totalOps) * 100 : 0;
      const averageWin = data.wins > 0 ? data.totalWinAmount / data.wins : 0;
      const averageLoss = data.losses > 0 ? data.totalLossAmount / data.losses : 0;
      const payoff = averageLoss > 0 ? averageWin / averageLoss : 0;

      return {
        strategy,
        totalOps: data.totalOps,
        totalResult: data.totalResult,
        winRate,
        payoff,
        averageWin,
        averageLoss,
        maxDrawdown: data.maxDrawdown,
        positive: data.positive,
        negative: data.negative,
      };
    }).sort((a, b) => b.totalResult - a.totalResult);

    setStrategyStats(strategyStatsArray);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-primary/20 rounded-full"></div>
          <div className="absolute top-0 left-0 w-20 h-20 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (operations.length === 0 && !rpcData && !loadingOps && !loading) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-24 text-center"
      >
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-6 shadow-xl">
          <BarChart2 className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Nenhuma operação encontrada</h3>
        <p className="text-muted-foreground max-w-md">
          Comece a registrar suas operações para visualizar estatísticas detalhadas e análises de performance.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <RobosHero
        totalOperations={rpcData?.totalOperations ?? filteredOperations.length}
        totalDays={stats.positiveDays + stats.negativeDays}
        totalResult={rpcData?.netResult ?? stats.totalResult}
        winRate={rpcData?.winRate ?? stats.winRate}
        positiveDays={stats.positiveDays}
        negativeDays={stats.negativeDays}
        payoff={rpcData?.payoff ?? stats.payoff}
        monthlyConsistency={stats.monthlyConsistency}
        positiveMonths={stats.positiveMonths}
        negativeMonths={stats.negativeMonths}
      />

      {/* Filters */}
      <RobosFilters
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        strategyFilter={strategyFilter}
        setStrategyFilter={setStrategyFilter}
        availableStrategies={availableStrategies}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        hourFilter={hourFilter}
        setHourFilter={setHourFilter}
        weekdayFilter={weekdayFilter}
        setWeekdayFilter={setWeekdayFilter}
        monthFilter={monthFilter}
        setMonthFilter={setMonthFilter}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
        filteredCount={filteredOperations.length}
      />

      {/* Quick Stats */}
      <RobosQuickStats stats={stats} />

      {/* Charts */}
      <RobosCharts
        performanceCurve={performanceCurve}
        monthStats={monthStats}
        yearlyStats={yearlyStats}
        hourDistribution={hourDistribution}
      />


      {/* Advanced Metrics, Calendar, Heatmap — load progressively */}
      {loadingOps ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="animate-spin w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full mx-auto mb-4"></div>
          <p>Carregando métricas detalhadas ({operations.length.toLocaleString()} operações)...</p>
        </div>
      ) : (
        <>
          <AdvancedMetrics operations={filteredOperations} />
          <PerformanceCalendar operations={filteredOperations.map(op => ({
            id: `${op.operation_date}-${op.operation_time}`,
            operation_date: op.operation_date,
            result: op.result,
            strategy: op.strategy || undefined,
          }))} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PerformanceHeatmap operations={filteredOperations} />
            <TopPerformanceDays operations={filteredOperations} />
          </div>
        </>
      )}
    </div>
  );
};

export default OperationsDashboard;
