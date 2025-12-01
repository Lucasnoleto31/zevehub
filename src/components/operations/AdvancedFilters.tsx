import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export interface AdvancedFilterValues {
  traderId?: string;
  startDate?: Date;
  endDate?: Date;
  strategies: string[];
}

interface AdvancedFiltersProps {
  onFiltersChange: (filters: AdvancedFilterValues) => void;
}

export const AdvancedFilters = ({ onFiltersChange }: AdvancedFiltersProps) => {
  const [filters, setFilters] = useState<AdvancedFilterValues>({
    strategies: [],
  });
  const [traders, setTraders] = useState<{ id: string; name: string }[]>([]);
  const [strategies, setStrategies] = useState<string[]>([]);

  useEffect(() => {
    loadTraders();
    loadStrategies();
  }, []);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const loadTraders = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      if (error) throw error;
      
      const tradersList = (data || []).map(profile => ({
        id: profile.id,
        name: profile.full_name || profile.email,
      }));
      
      setTraders(tradersList);
    } catch (error) {
      console.error("Erro ao carregar traders:", error);
    }
  };

  const loadStrategies = async () => {
    try {
      const { data, error } = await supabase
        .from("trading_operations")
        .select("strategy");

      if (error) throw error;

      const uniqueStrategies = Array.from(
        new Set(data?.map(op => op.strategy).filter(Boolean))
      ) as string[];
      
      setStrategies(uniqueStrategies.sort());
    } catch (error) {
      console.error("Erro ao carregar estratégias:", error);
    }
  };

  const toggleStrategy = (strategy: string) => {
    setFilters(prev => ({
      ...prev,
      strategies: prev.strategies.includes(strategy)
        ? prev.strategies.filter(s => s !== strategy)
        : [...prev.strategies, strategy],
    }));
  };

  const clearFilters = () => {
    setFilters({
      strategies: [],
    });
  };

  const hasActiveFilters = 
    filters.traderId ||
    filters.startDate ||
    filters.endDate ||
    filters.strategies.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Filtros Avançados</CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtro de Trader */}
        <div>
          <Label>Trader</Label>
          <Select
            value={filters.traderId || "all"}
            onValueChange={(value) =>
              setFilters({ ...filters, traderId: value === "all" ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os traders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os traders</SelectItem>
              {traders.map((trader) => (
                <SelectItem key={trader.id} value={trader.id}>
                  {trader.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtros de Data */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Data Inicial</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.startDate
                    ? format(filters.startDate, "dd/MM/yyyy", { locale: ptBR })
                    : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.startDate}
                  onSelect={(date) => setFilters({ ...filters, startDate: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Data Final</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.endDate
                    ? format(filters.endDate, "dd/MM/yyyy", { locale: ptBR })
                    : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.endDate}
                  onSelect={(date) => setFilters({ ...filters, endDate: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Filtro de Estratégias (Multi-select) */}
        <div>
          <Label>Estratégias</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {strategies.map((strategy) => (
              <Badge
                key={strategy}
                variant={filters.strategies.includes(strategy) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleStrategy(strategy)}
              >
                {strategy}
              </Badge>
            ))}
            {strategies.length === 0 && (
              <span className="text-sm text-muted-foreground">
                Nenhuma estratégia encontrada
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
