import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, X, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface OperationsFiltersProps {
  userId: string;
  onFiltersChange: (filters: FilterValues) => void;
}

export interface FilterValues {
  dateFrom?: Date;
  dateTo?: Date;
  strategies: string[];
  asset: string;
  contractsMin: string;
  contractsMax: string;
  timeFrom: string;
  timeTo: string;
  resultType: string; // 'all', 'positive', 'negative'
}

export const OperationsFilters = ({ userId, onFiltersChange }: OperationsFiltersProps) => {
  const [filters, setFilters] = useState<FilterValues>({
    strategies: [],
    asset: "",
    contractsMin: "",
    contractsMax: "",
    timeFrom: "",
    timeTo: "",
    resultType: "all",
  });
  const [strategies, setStrategies] = useState<{ id: string; name: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadStrategies();
  }, [userId]);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const loadStrategies = async () => {
    try {
      const { data, error } = await supabase
        .from("strategies")
        .select("id, name")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (error) throw error;
      setStrategies(data || []);
    } catch (error) {
      console.error("Erro ao carregar estratégias:", error);
    }
  };

  const toggleStrategy = (strategyName: string) => {
    setFilters((prev) => ({
      ...prev,
      strategies: prev.strategies.includes(strategyName)
        ? prev.strategies.filter((s) => s !== strategyName)
        : [...prev.strategies, strategyName],
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      strategies: [],
      asset: "",
      contractsMin: "",
      contractsMax: "",
      timeFrom: "",
      timeTo: "",
      resultType: "all",
    });
  };

  const hasActiveFilters = 
    filters.dateFrom ||
    filters.dateTo ||
    filters.strategies.length > 0 ||
    filters.asset ||
    filters.contractsMin ||
    filters.contractsMax ||
    filters.timeFrom ||
    filters.timeTo ||
    filters.resultType !== "all";

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1">
                  Ativos
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="w-4 h-4 mr-1" />
                Limpar Todos
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="space-y-4 pt-4 border-t">
              {/* Filtros de Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Data Inicial</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateFrom
                          ? format(filters.dateFrom, "dd/MM/yyyy", { locale: ptBR })
                          : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom}
                        onSelect={(date) => setFilters({ ...filters, dateFrom: date })}
                        initialFocus
                        className="pointer-events-auto"
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
                          !filters.dateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateTo
                          ? format(filters.dateTo, "dd/MM/yyyy", { locale: ptBR })
                          : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo}
                        onSelect={(date) => setFilters({ ...filters, dateTo: date })}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Filtro de Estratégias */}
              <div>
                <Label>Estratégias</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {strategies.map((strategy) => (
                    <Badge
                      key={strategy.id}
                      variant={filters.strategies.includes(strategy.name) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleStrategy(strategy.name)}
                    >
                      {strategy.name}
                    </Badge>
                  ))}
                  {strategies.length === 0 && (
                    <span className="text-sm text-muted-foreground">Nenhuma estratégia cadastrada</span>
                  )}
                </div>
              </div>

              {/* Filtro de Ativo */}
              <div>
                <Label htmlFor="filter-asset">Ativo</Label>
                <Input
                  id="filter-asset"
                  placeholder="Ex: WINJ25, WDOJ25"
                  value={filters.asset}
                  onChange={(e) => setFilters({ ...filters, asset: e.target.value })}
                />
              </div>

              {/* Filtros de Contratos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="filter-contracts-min">Contratos Mín.</Label>
                  <Input
                    id="filter-contracts-min"
                    type="number"
                    min="0"
                    placeholder="Mínimo"
                    value={filters.contractsMin}
                    onChange={(e) => setFilters({ ...filters, contractsMin: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="filter-contracts-max">Contratos Máx.</Label>
                  <Input
                    id="filter-contracts-max"
                    type="number"
                    min="0"
                    placeholder="Máximo"
                    value={filters.contractsMax}
                    onChange={(e) => setFilters({ ...filters, contractsMax: e.target.value })}
                  />
                </div>
              </div>

              {/* Filtros de Horário */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="filter-time-from">Horário Inicial</Label>
                  <Input
                    id="filter-time-from"
                    type="time"
                    value={filters.timeFrom}
                    onChange={(e) => setFilters({ ...filters, timeFrom: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="filter-time-to">Horário Final</Label>
                  <Input
                    id="filter-time-to"
                    type="time"
                    value={filters.timeTo}
                    onChange={(e) => setFilters({ ...filters, timeTo: e.target.value })}
                  />
                </div>
              </div>

              {/* Filtro de Resultado */}
              <div>
                <Label htmlFor="filter-result">Resultado</Label>
                <Select
                  value={filters.resultType}
                  onValueChange={(value) => setFilters({ ...filters, resultType: value })}
                >
                  <SelectTrigger id="filter-result">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="positive">Positivos</SelectItem>
                    <SelectItem value="negative">Negativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
