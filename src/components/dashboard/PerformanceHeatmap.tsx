import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Operation {
  operation_date: string;
  operation_time: string;
  result: number;
}

interface HeatmapData {
  weekday: string;
  hour: string;
  result: number;
  operations: number;
  bestTrade: number;
  worstTrade: number;
  totalResult: number;
}

interface PerformanceHeatmapProps {
  operations: Operation[];
}

const PerformanceHeatmap = ({ operations }: PerformanceHeatmapProps) => {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);

  useEffect(() => {
    processHeatmapData();
  }, [operations]);

  const processHeatmapData = () => {
    const heatmapMap = new Map<string, { results: number[]; count: number }>();

    operations.forEach((op) => {
      const [year, month, day] = op.operation_date.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const weekday = date.getDay();
      const hour = parseInt(op.operation_time.split(":")[0]);

      if (weekday === 0 || weekday === 6) return;

      const key = `${weekday}-${hour}`;

      if (!heatmapMap.has(key)) {
        heatmapMap.set(key, { results: [], count: 0 });
      }

      const current = heatmapMap.get(key)!;
      current.results.push(op.result);
      current.count += 1;
    });

    const heatmapArray: HeatmapData[] = [];
    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    for (let day = 1; day <= 5; day++) {
      for (let hour = 9; hour <= 17; hour++) {
        const key = `${day}-${hour}`;
        const data = heatmapMap.get(key);

        if (data && data.results.length > 0) {
          const totalResult = data.results.reduce((sum, r) => sum + r, 0);
          const avgResult = totalResult / data.results.length;
          const bestTrade = Math.max(...data.results);
          const worstTrade = Math.min(...data.results);

          heatmapArray.push({
            weekday: weekdays[day],
            hour: `${hour}h`,
            result: avgResult,
            operations: data.count,
            bestTrade,
            worstTrade,
            totalResult,
          });
        } else {
          heatmapArray.push({
            weekday: weekdays[day],
            hour: `${hour}h`,
            result: 0,
            operations: 0,
            bestTrade: 0,
            worstTrade: 0,
            totalResult: 0,
          });
        }
      }
    }

    setHeatmapData(heatmapArray);
  };

  const getColorIntensity = (result: number, operations: number) => {
    if (operations === 0) return "bg-muted";
    
    const maxResult = Math.max(...heatmapData.map(d => Math.abs(d.result)));
    const intensity = maxResult > 0 ? Math.abs(result) / maxResult : 0;
    
    if (result > 0) {
      if (intensity > 0.7) return "bg-success text-success-foreground";
      if (intensity > 0.4) return "bg-success/70 text-success-foreground";
      if (intensity > 0.1) return "bg-success/40";
      return "bg-success/20";
    } else if (result < 0) {
      if (intensity > 0.7) return "bg-destructive text-destructive-foreground";
      if (intensity > 0.4) return "bg-destructive/70 text-destructive-foreground";
      if (intensity > 0.1) return "bg-destructive/40";
      return "bg-destructive/20";
    }
    
    return "bg-muted";
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex"];
  const hours = Array.from({ length: 9 }, (_, i) => `${i + 9}h`);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Heatmap de Performance
        </CardTitle>
        <CardDescription>
          Horários e dias da semana mais lucrativos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Header com dias da semana */}
              <div className="flex gap-1 mb-2">
                <div className="w-16" />
                {weekdays.map((day) => (
                  <div
                    key={day}
                    className="flex-1 min-w-[60px] text-center text-sm font-semibold text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid do heatmap */}
              {hours.map((hour) => (
                <div key={hour} className="flex gap-1 mb-1">
                  <div className="w-16 text-sm text-muted-foreground flex items-center">
                    {hour}
                  </div>
                  {weekdays.map((day) => {
                    const cellData = heatmapData.find(
                      (d) => d.weekday === day && d.hour === hour
                    );
                    
                    return (
                      <Tooltip key={`${day}-${hour}`}>
                        <TooltipTrigger asChild>
                          <div
                            className={`flex-1 min-w-[60px] h-12 rounded flex items-center justify-center text-xs font-medium transition-all hover:scale-105 cursor-pointer ${getColorIntensity(
                              cellData?.result || 0,
                              cellData?.operations || 0
                            )}`}
                          >
                            {cellData && cellData.operations > 0 && (
                              <span>{cellData.operations}</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="top" 
                          className="bg-card border border-border p-3 shadow-lg"
                        >
                          <div className="space-y-1.5 text-sm">
                            <p className="font-semibold text-foreground">
                              {day} às {hour}
                            </p>
                            <div className="space-y-1 text-muted-foreground">
                              <p>
                                <span className="text-foreground font-medium">Operações:</span>{" "}
                                {cellData?.operations || 0}
                              </p>
                              <p>
                                <span className="text-foreground font-medium">Resultado Total:</span>{" "}
                                <span className={cellData && cellData.totalResult > 0 ? "text-success" : cellData && cellData.totalResult < 0 ? "text-destructive" : ""}>
                                  {formatCurrency(cellData?.totalResult || 0)}
                                </span>
                              </p>
                              <p>
                                <span className="text-foreground font-medium">Média:</span>{" "}
                                <span className={cellData && cellData.result > 0 ? "text-success" : cellData && cellData.result < 0 ? "text-destructive" : ""}>
                                  {formatCurrency(cellData?.result || 0)}
                                </span>
                              </p>
                              {cellData && cellData.operations > 0 && (
                                <>
                                  <p>
                                    <span className="text-foreground font-medium">Melhor Trade:</span>{" "}
                                    <span className="text-success">
                                      {formatCurrency(cellData.bestTrade)}
                                    </span>
                                  </p>
                                  <p>
                                    <span className="text-foreground font-medium">Pior Trade:</span>{" "}
                                    <span className="text-destructive">
                                      {formatCurrency(cellData.worstTrade)}
                                    </span>
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}

              {/* Legenda */}
              <div className="mt-6 flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-destructive" />
                  <span className="text-muted-foreground">Prejuízo alto</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-muted" />
                  <span className="text-muted-foreground">Sem dados</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-success" />
                  <span className="text-muted-foreground">Lucro alto</span>
                </div>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};

export default PerformanceHeatmap;
