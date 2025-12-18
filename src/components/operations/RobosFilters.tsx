import { motion, AnimatePresence } from "framer-motion";
import { 
  Filter, 
  Calendar, 
  Clock, 
  Bot,
  ChevronDown,
  X,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RobosFiltersProps {
  dateFilter: string;
  setDateFilter: (value: string) => void;
  strategyFilter: string[];
  setStrategyFilter: (value: string[]) => void;
  availableStrategies: string[];
  customStartDate?: Date;
  setCustomStartDate: (date?: Date) => void;
  customEndDate?: Date;
  setCustomEndDate: (date?: Date) => void;
  hourFilter: string[];
  setHourFilter: (value: string[]) => void;
  weekdayFilter: string[];
  setWeekdayFilter: (value: string[]) => void;
  monthFilter: string[];
  setMonthFilter: (value: string[]) => void;
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
  filteredCount: number;
}

const FilterChip = ({
  active, 
  onClick, 
  children,
  color = "default"
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
  color?: "default" | "cyan" | "violet" | "emerald" | "amber";
}) => {
  const colorVariants = {
    default: active 
      ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-primary shadow-lg shadow-primary/25" 
      : "bg-card/60 hover:bg-primary/10 hover:border-primary/40",
    cyan: active
      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/25"
      : "bg-card/60 hover:bg-cyan-500/10 hover:border-cyan-400/40",
    violet: active
      ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white border-violet-400 shadow-lg shadow-violet-500/25"
      : "bg-card/60 hover:bg-violet-500/10 hover:border-violet-400/40",
    emerald: active
      ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/25"
      : "bg-card/60 hover:bg-emerald-500/10 hover:border-emerald-400/40",
    amber: active
      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-400 shadow-lg shadow-amber-500/25"
      : "bg-card/60 hover:bg-amber-500/10 hover:border-amber-400/40",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
        "border border-border/50",
        colorVariants[color]
      )}
    >
      {children}
    </motion.button>
  );
};

const ActiveFilterTag = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <motion.span
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/20"
  >
    {label}
    <button 
      onClick={onRemove}
      className="p-0.5 rounded-full hover:bg-primary/20 transition-colors"
    >
      <X className="w-3 h-3" />
    </button>
  </motion.span>
);

export const RobosFilters = ({
  dateFilter,
  setDateFilter,
  strategyFilter,
  setStrategyFilter,
  availableStrategies,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  hourFilter,
  setHourFilter,
  weekdayFilter,
  setWeekdayFilter,
  monthFilter,
  setMonthFilter,
  filtersOpen,
  setFiltersOpen,
  filteredCount,
}: RobosFiltersProps) => {
  const activeFiltersCount = 
    (strategyFilter.length > 0 ? 1 : 0) +
    (hourFilter.length > 0 ? 1 : 0) +
    (weekdayFilter.length > 0 ? 1 : 0) +
    (monthFilter.length > 0 ? 1 : 0) +
    (dateFilter !== "all" ? 1 : 0);

  const clearAllFilters = () => {
    setDateFilter("all");
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    setStrategyFilter([]);
    setHourFilter([]);
    setWeekdayFilter([]);
    setMonthFilter([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-xl overflow-hidden shadow-xl">
          {/* Header */}
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-5 hover:bg-muted/20 transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-2.5 rounded-xl transition-all duration-300",
                  activeFiltersCount > 0 
                    ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25" 
                    : "bg-primary/10 text-primary group-hover:bg-primary/20"
                )}>
                  <Filter className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    Filtros Inteligentes
                    {activeFiltersCount > 0 && (
                      <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {activeFiltersCount > 0 
                      ? `${activeFiltersCount} filtro${activeFiltersCount > 1 ? 's' : ''} ativo${activeFiltersCount > 1 ? 's' : ''}` 
                      : "Personalize sua visualização"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <AnimatePresence>
                  {activeFiltersCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        {filteredCount.toLocaleString()} resultados
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.div
                  animate={{ rotate: filtersOpen ? 180 : 0 }}
                  className="p-2 rounded-full bg-muted/50"
                >
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                </motion.div>
              </div>
            </button>
          </CollapsibleTrigger>

          {/* Active Filters Summary (collapsed) */}
          <AnimatePresence>
            {activeFiltersCount > 0 && !filtersOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-5 pb-4 flex flex-wrap gap-2"
              >
                {dateFilter !== "all" && (
                  <ActiveFilterTag 
                    label={dateFilter === "today" ? "Hoje" : 
                           dateFilter === "7days" ? "7 dias" :
                           dateFilter === "30days" ? "30 dias" :
                           dateFilter === "currentMonth" ? "Este mês" :
                           dateFilter === "currentYear" ? "Este ano" : "Personalizado"}
                    onRemove={() => {
                      setDateFilter("all");
                      setCustomStartDate(undefined);
                      setCustomEndDate(undefined);
                    }}
                  />
                )}
                {strategyFilter.map(s => (
                  <ActiveFilterTag 
                    key={s}
                    label={s}
                    onRemove={() => setStrategyFilter(strategyFilter.filter(x => x !== s))}
                  />
                ))}
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-destructive hover:text-destructive/80 font-medium px-2 py-1 rounded-full hover:bg-destructive/10 transition-colors"
                >
                  Limpar todos
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          
          <CollapsibleContent>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-5 pb-6 space-y-6 border-t border-border/30 pt-5"
            >
              {/* Clear All */}
              {activeFiltersCount > 0 && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                  >
                    <X className="w-4 h-4 mr-1.5" />
                    Limpar todos
                  </Button>
                </div>
              )}

              {/* Period Filter */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <label className="text-sm font-semibold">Período</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Todos", value: "all" },
                    { label: "Hoje", value: "today" },
                    { label: "7 dias", value: "7days" },
                    { label: "30 dias", value: "30days" },
                    { label: "Este mês", value: "currentMonth" },
                    { label: "Este ano", value: "currentYear" },
                  ].map((option) => (
                    <FilterChip
                      key={option.value}
                      active={dateFilter === option.value}
                      onClick={() => setDateFilter(option.value)}
                    >
                      {option.label}
                    </FilterChip>
                  ))}
                </div>
                
                {/* Custom Date */}
                <div className="flex flex-wrap gap-3 items-center p-3 rounded-xl bg-muted/20 border border-border/30">
                  <span className="text-xs font-medium text-muted-foreground">Personalizado:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-full h-8 text-xs">
                        {customStartDate 
                          ? format(customStartDate, "dd/MM/yyyy", { locale: ptBR })
                          : "Data início"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customStartDate}
                        onSelect={(date) => {
                          setCustomStartDate(date);
                          setDateFilter("custom");
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <span className="text-xs text-muted-foreground">até</span>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-full h-8 text-xs">
                        {customEndDate 
                          ? format(customEndDate, "dd/MM/yyyy", { locale: ptBR })
                          : "Data fim"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customEndDate}
                        onSelect={(date) => {
                          setCustomEndDate(date);
                          setDateFilter("custom");
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Strategy Filter */}
              {availableStrategies.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-500">
                        <Bot className="w-4 h-4" />
                      </div>
                      <label className="text-sm font-semibold">Estratégias</label>
                      {strategyFilter.length > 0 && (
                        <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20">
                          {strategyFilter.length}
                        </Badge>
                      )}
                    </div>
                    {strategyFilter.length > 0 && (
                      <button 
                        onClick={() => setStrategyFilter([])}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <FilterChip
                      active={strategyFilter.length === 0}
                      onClick={() => setStrategyFilter([])}
                      color="cyan"
                    >
                      Todas
                    </FilterChip>
                    {availableStrategies.map((strategy) => (
                      <FilterChip
                        key={strategy}
                        active={strategyFilter.includes(strategy)}
                        onClick={() => {
                          if (strategyFilter.includes(strategy)) {
                            setStrategyFilter(strategyFilter.filter(s => s !== strategy));
                          } else {
                            setStrategyFilter([...strategyFilter, strategy]);
                          }
                        }}
                        color="cyan"
                      >
                        {strategy}
                      </FilterChip>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Filters Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Hour Filter */}
                <div className="space-y-3 p-4 rounded-xl bg-violet-500/5 border border-violet-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-500">
                        <Clock className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold">Horários</span>
                    </div>
                    {hourFilter.length > 0 && (
                      <button 
                        onClick={() => setHourFilter([])}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {["9", "10", "11", "12", "13", "14", "15", "16", "17"].map((hour) => (
                      <FilterChip
                        key={hour}
                        active={hourFilter.includes(hour)}
                        onClick={() => {
                          if (hourFilter.includes(hour)) {
                            setHourFilter(hourFilter.filter(h => h !== hour));
                          } else {
                            setHourFilter([...hourFilter, hour]);
                          }
                        }}
                        color="violet"
                      >
                        {hour}h
                      </FilterChip>
                    ))}
                  </div>
                </div>

                {/* Weekday Filter */}
                <div className="space-y-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold">Dias</span>
                    </div>
                    {weekdayFilter.length > 0 && (
                      <button 
                        onClick={() => setWeekdayFilter([])}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "Seg", value: "1" },
                      { label: "Ter", value: "2" },
                      { label: "Qua", value: "3" },
                      { label: "Qui", value: "4" },
                      { label: "Sex", value: "5" },
                    ].map((day) => (
                      <FilterChip
                        key={day.value}
                        active={weekdayFilter.includes(day.value)}
                        onClick={() => {
                          if (weekdayFilter.includes(day.value)) {
                            setWeekdayFilter(weekdayFilter.filter(d => d !== day.value));
                          } else {
                            setWeekdayFilter([...weekdayFilter, day.value]);
                          }
                        }}
                        color="emerald"
                      >
                        {day.label}
                      </FilterChip>
                    ))}
                  </div>
                </div>

                {/* Month Filter */}
                <div className="space-y-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold">Meses</span>
                    </div>
                    {monthFilter.length > 0 && (
                      <button 
                        onClick={() => setMonthFilter([])}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      "Jan", "Fev", "Mar", "Abr", 
                      "Mai", "Jun", "Jul", "Ago", 
                      "Set", "Out", "Nov", "Dez"
                    ].map((month, index) => (
                      <FilterChip
                        key={month}
                        active={monthFilter.includes(index.toString())}
                        onClick={() => {
                          const value = index.toString();
                          if (monthFilter.includes(value)) {
                            setMonthFilter(monthFilter.filter(m => m !== value));
                          } else {
                            setMonthFilter([...monthFilter, value]);
                          }
                        }}
                        color="amber"
                      >
                        {month}
                      </FilterChip>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </motion.div>
  );
};

export default RobosFilters;
