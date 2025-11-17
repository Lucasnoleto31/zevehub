import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp } from "lucide-react";

interface PeriodFilterProps {
  value: 'month' | 'quarter' | 'year' | 'all';
  onChange: (period: 'month' | 'quarter' | 'year' | 'all') => void;
}

export const PeriodFilter = ({ value, onChange }: PeriodFilterProps) => {
  const periods = [
    { value: 'month' as const, label: 'Último Mês' },
    { value: 'quarter' as const, label: 'Último Trimestre' },
    { value: 'year' as const, label: 'Último Ano' },
    { value: 'all' as const, label: 'Tudo' }
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Período:</span>
      {periods.map(period => (
        <Button
          key={period.value}
          variant={value === period.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(period.value)}
        >
          {period.label}
        </Button>
      ))}
    </div>
  );
};
