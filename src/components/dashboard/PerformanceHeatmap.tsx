import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

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
    // Processar dados para criar matriz de heatmap
    const heatmapMap = new Map<string, { result: number; count: number }>();

    operations.forEach((op) => {
      // Parse date mais confiável para evitar problemas de timezone
      const [year, month, day] = op.operation_date.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const weekday = date.getDay(); // 0=Dom, 1=Seg...6=Sab
      const hour = parseInt(op.operation_time.split(":")[0]);

      // Ignorar apenas fins de semana (domingo=0 e sábado=6)
      if (weekday === 0 || weekday === 6) return;

      const key = `${weekday}-${hour}`;

      if (!heatmapMap.has(key)) {
        heatmapMap.set(key, { result: 0, count: 0 });
      }

      const current = heatmapMap.get(key)!;
      current.result += op.result;
      current.count += 1;
    });

    // Converter para array
    const heatmapArray: HeatmapData[] = [];
    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    for (let day = 1; day <= 5; day++) {
      for (let hour = 9; hour <= 17; hour++) {
        const key = `${day}-${hour}`;
        const data = heatmapMap.get(key);

        heatmapArray.push({
          weekday: weekdays[day],
          hour: `${hour}h`,
          result: data ? data.result / data.count : 0,
          operations: data ? data.count : 0,
        });
      }
    }

    setHeatmapData(heatmapArray);
  };

  const getColorIntensity = (result: number, operations: number) => {
    if (operations === 0) return "bg-muted";
    
    const maxResult = Math.max(...heatmapData.map(d => Math.abs(d.result)));
    const intensity = Math.abs(result) / maxResult;
    
    if (result > 0) {
      // Verde para positivo
      if (intensity > 0.7) return "bg-success text-success-foreground";
      if (intensity > 0.4) return "bg-success/70 text-success-foreground";
      if (intensity > 0.1) return "bg-success/40";
      return "bg-success/20";
    } else if (result < 0) {
      // Vermelho para negativo
      if (intensity > 0.7) return "bg-destructive text-destructive-foreground";
      if (intensity > 0.4) return "bg-destructive/70 text-destructive-foreground";
      if (intensity > 0.1) return "bg-destructive/40";
      return "bg-destructive/20";
    }
    
    return "bg-muted";
  };

  const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex"];
  const hours = Array.from({ length: 9 }, (_, i) => `${i + 9}h`);

  return (
    <Card className="animate-chart-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Heatmap de Performance
        </CardTitle>
        <CardDescription>
          Horários e dias da semana mais lucrativos
        </CardDescription>
      </CardHeader>
      <CardContent className="animate-scale-in">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Header com dias da semana */}
            <div className="flex gap-1 mb-2">
              <div className="w-16" /> {/* Espaço para labels de horas */}
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
                    <div
                      key={`${day}-${hour}`}
                      className={`flex-1 min-w-[60px] h-12 rounded flex items-center justify-center text-xs font-medium transition-all hover:scale-105 cursor-pointer ${getColorIntensity(
                        cellData?.result || 0,
                        cellData?.operations || 0
                      )}`}
                      title={`${day} ${hour}\n${cellData?.operations || 0} operações\nMédia: R$ ${(cellData?.result || 0).toFixed(2)}`}
                    >
                      {cellData && cellData.operations > 0 && (
                        <span>
                          {cellData.operations}
                        </span>
                      )}
                    </div>
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
      </CardContent>
    </Card>
  );
};

export default PerformanceHeatmap;
