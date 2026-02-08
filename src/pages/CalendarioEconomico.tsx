import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  Globe,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Bell,
  Flag,
  DollarSign,
  BarChart3,
  Users,
  Building2,
  Trash2,
  Edit,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, isBefore, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { PremiumPageLayout, PremiumCard, PremiumSection } from "@/components/layout/PremiumPageLayout";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";

interface EconomicEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  country: string;
  impact: "low" | "medium" | "high";
  category: string;
  previous_value: string | null;
  forecast_value: string | null;
  actual_value: string | null;
}

const COUNTRY_FLAGS: Record<string, string> = {
  BR: "🇧🇷",
  US: "🇺🇸",
  EU: "🇪🇺",
  JP: "🇯🇵",
  CN: "🇨🇳",
  GB: "🇬🇧",
};

const COUNTRY_NAMES: Record<string, string> = {
  BR: "Brasil",
  US: "Estados Unidos",
  EU: "Europa",
  JP: "Japão",
  CN: "China",
  GB: "Reino Unido",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  monetary_policy: <Building2 className="w-4 h-4" />,
  inflation: <TrendingUp className="w-4 h-4" />,
  employment: <Users className="w-4 h-4" />,
  gdp: <BarChart3 className="w-4 h-4" />,
  trade: <Globe className="w-4 h-4" />,
  other: <Calendar className="w-4 h-4" />,
};

const CATEGORY_NAMES: Record<string, string> = {
  monetary_policy: "Política Monetária",
  inflation: "Inflação",
  employment: "Emprego",
  gdp: "PIB",
  trade: "Comércio",
  other: "Outros",
};

const CalendarioEconomico = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedImpact, setSelectedImpact] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EconomicEvent | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_date: "",
    event_time: "",
    country: "BR",
    impact: "medium",
    category: "other",
    previous_value: "",
    forecast_value: "",
  });

  useEffect(() => {
    loadEvents();
  }, [currentMonth]);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("economic_events")
        .select("*")
        .gte("event_date", startDate)
        .lte("event_date", endDate)
        .order("event_date", { ascending: true })
        .order("event_time", { ascending: true });

      if (error) throw error;
      setEvents((data || []).map(e => ({
        ...e,
        impact: e.impact as "low" | "medium" | "high"
      })));
    } catch (error) {
      console.error("Erro ao carregar eventos:", error);
      toast.error("Erro ao carregar calendário");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (selectedCountry !== "all" && event.country !== selectedCountry) return false;
      if (selectedImpact !== "all" && event.impact !== selectedImpact) return false;
      if (selectedDate && !isSameDay(parseISO(event.event_date), selectedDate)) return false;
      return true;
    });
  }, [events, selectedCountry, selectedImpact, selectedDate]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    return events
      .filter((e) => !isBefore(parseISO(e.event_date), today))
      .sort((a, b) => parseISO(a.event_date).getTime() - parseISO(b.event_date).getTime())
      .slice(0, 5);
  }, [events]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(parseISO(event.event_date), day));
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-destructive text-destructive-foreground";
      case "medium":
        return "bg-yellow-500 text-white";
      case "low":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getImpactLabel = (impact: string) => {
    switch (impact) {
      case "high":
        return "Alto";
      case "medium":
        return "Médio";
      case "low":
        return "Baixo";
      default:
        return impact;
    }
  };

  const handleSaveEvent = async () => {
    try {
      const eventData = {
        title: formData.title,
        description: formData.description || null,
        event_date: formData.event_date,
        event_time: formData.event_time || null,
        country: formData.country,
        impact: formData.impact,
        category: formData.category,
        previous_value: formData.previous_value || null,
        forecast_value: formData.forecast_value || null,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from("economic_events")
          .update(eventData)
          .eq("id", editingEvent.id);
        if (error) throw error;
        toast.success("Evento atualizado!");
      } else {
        const { error } = await supabase
          .from("economic_events")
          .insert(eventData);
        if (error) throw error;
        toast.success("Evento adicionado!");
      }

      setShowAddDialog(false);
      setEditingEvent(null);
      resetForm();
      loadEvents();
    } catch (error) {
      console.error("Erro ao salvar evento:", error);
      toast.error("Erro ao salvar evento");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;
    
    try {
      const { error } = await supabase
        .from("economic_events")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Evento excluído!");
      loadEvents();
    } catch (error) {
      console.error("Erro ao excluir evento:", error);
      toast.error("Erro ao excluir evento");
    }
  };

  const handleEditEvent = (event: EconomicEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      event_date: event.event_date,
      event_time: event.event_time || "",
      country: event.country,
      impact: event.impact,
      category: event.category,
      previous_value: event.previous_value || "",
      forecast_value: event.forecast_value || "",
    });
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      event_date: "",
      event_time: "",
      country: "BR",
      impact: "medium",
      category: "other",
      previous_value: "",
      forecast_value: "",
    });
  };

  const formatTime = (time: string | null) => {
    if (!time) return "";
    return time.substring(0, 5);
  };

  if (isLoading) {
    return (
      <PremiumPageLayout
        title="Calendário Econômico"
        subtitle="Eventos que movem o mercado"
        icon={Calendar}
      >
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PremiumPageLayout>
    );
  }

  return (
    <PremiumPageLayout
      title="Calendário Econômico"
      subtitle="Eventos que movem o mercado"
      icon={Calendar}
      headerActions={
        isAdmin && (
          <Button onClick={() => { resetForm(); setEditingEvent(null); setShowAddDialog(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Evento
          </Button>
        )
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="País" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os países</SelectItem>
                <SelectItem value="BR">🇧🇷 Brasil</SelectItem>
                <SelectItem value="US">🇺🇸 EUA</SelectItem>
                <SelectItem value="EU">🇪🇺 Europa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedImpact} onValueChange={setSelectedImpact}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Impacto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="high">🔴 Alto</SelectItem>
                <SelectItem value="medium">🟡 Médio</SelectItem>
                <SelectItem value="low">⚪ Baixo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDate(null)}
              className="gap-2"
            >
              Limpar filtro de data
            </Button>
          )}
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <PremiumCard className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Hoje
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before first of month */}
              {Array.from({ length: calendarDays[0].getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {calendarDays.map((day) => {
                const dayEvents = getEventsForDay(day);
                const hasHighImpact = dayEvents.some((e) => e.impact === "high");
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <TooltipProvider key={day.toISOString()}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setSelectedDate(isSelected ? null : day)}
                          className={`
                            aspect-square rounded-lg p-1 flex flex-col items-center justify-center
                            transition-all hover:bg-accent/50 relative
                            ${isToday(day) ? "ring-2 ring-primary" : ""}
                            ${isSelected ? "bg-primary text-primary-foreground" : ""}
                            ${dayEvents.length > 0 ? "font-semibold" : "text-muted-foreground"}
                          `}
                        >
                          <span className="text-sm">{format(day, "d")}</span>
                          {dayEvents.length > 0 && (
                            <div className="flex gap-0.5 mt-0.5">
                              {hasHighImpact ? (
                                <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                              )}
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      {dayEvents.length > 0 && (
                        <TooltipContent>
                          <div className="space-y-1">
                            {dayEvents.map((e) => (
                              <div key={e.id} className="flex items-center gap-2">
                                <span>{COUNTRY_FLAGS[e.country]}</span>
                                <span className="text-xs">{e.title}</span>
                              </div>
                            ))}
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <span>Alto impacto</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span>Médio impacto</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full ring-2 ring-primary" />
                <span>Hoje</span>
              </div>
            </div>
          </PremiumCard>

          {/* Upcoming Events */}
          <PremiumCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Próximos Eventos</h3>
            </div>

            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum evento próximo
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{COUNTRY_FLAGS[event.country]}</span>
                        <div>
                          <p className="text-sm font-medium line-clamp-1">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(event.event_date), "dd/MM")}
                            {event.event_time && ` às ${formatTime(event.event_time)}`}
                          </p>
                        </div>
                      </div>
                      <Badge className={`${getImpactColor(event.impact)} text-xs`}>
                        {getImpactLabel(event.impact)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PremiumCard>
        </div>

        {/* Events List */}
        <PremiumCard className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              {selectedDate
                ? `Eventos em ${format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}`
                : `Eventos de ${format(currentMonth, "MMMM yyyy", { locale: ptBR })}`}
            </CardTitle>
            <CardDescription>
              {filteredEvents.length} evento(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum evento encontrado</p>
                <p className="text-sm">Ajuste os filtros ou selecione outra data</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-background border">
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(event.event_date), "MMM", { locale: ptBR }).toUpperCase()}
                            </span>
                            <span className="text-lg font-bold">
                              {format(parseISO(event.event_date), "dd")}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{COUNTRY_FLAGS[event.country]}</span>
                              <h4 className="font-medium">{event.title}</h4>
                              <Badge className={`${getImpactColor(event.impact)} text-xs`}>
                                {getImpactLabel(event.impact)}
                              </Badge>
                            </div>

                            {event.description && (
                              <p className="text-sm text-muted-foreground">
                                {event.description}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {event.event_time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(event.event_time)} (Brasília)
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                {CATEGORY_ICONS[event.category]}
                                {CATEGORY_NAMES[event.category] || event.category}
                              </span>
                            </div>

                            {(event.previous_value || event.forecast_value || event.actual_value) && (
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                {event.previous_value && (
                                  <div>
                                    <span className="text-muted-foreground">Anterior: </span>
                                    <span className="font-medium">{event.previous_value}</span>
                                  </div>
                                )}
                                {event.forecast_value && (
                                  <div>
                                    <span className="text-muted-foreground">Previsão: </span>
                                    <span className="font-medium">{event.forecast_value}</span>
                                  </div>
                                )}
                                {event.actual_value && (
                                  <div>
                                    <span className="text-muted-foreground">Atual: </span>
                                    <span className="font-medium text-primary">{event.actual_value}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditEvent(event)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteEvent(event.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </PremiumCard>
      </div>

      {/* Add/Edit Event Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "Editar Evento" : "Adicionar Evento"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do evento econômico
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: FOMC - Decisão Taxa de Juros"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes sobre o evento"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_date">Data *</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event_time">Horário</Label>
                <Input
                  id="event_time"
                  type="time"
                  value={formData.event_time}
                  onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>País</Label>
                <Select
                  value={formData.country}
                  onValueChange={(v) => setFormData({ ...formData, country: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BR">🇧🇷 Brasil</SelectItem>
                    <SelectItem value="US">🇺🇸 EUA</SelectItem>
                    <SelectItem value="EU">🇪🇺 Europa</SelectItem>
                    <SelectItem value="JP">🇯🇵 Japão</SelectItem>
                    <SelectItem value="CN">🇨🇳 China</SelectItem>
                    <SelectItem value="GB">🇬🇧 UK</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Impacto</Label>
                <Select
                  value={formData.impact}
                  onValueChange={(v) => setFormData({ ...formData, impact: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">🔴 Alto</SelectItem>
                    <SelectItem value="medium">🟡 Médio</SelectItem>
                    <SelectItem value="low">⚪ Baixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monetary_policy">Política Monetária</SelectItem>
                    <SelectItem value="inflation">Inflação</SelectItem>
                    <SelectItem value="employment">Emprego</SelectItem>
                    <SelectItem value="gdp">PIB</SelectItem>
                    <SelectItem value="trade">Comércio</SelectItem>
                    <SelectItem value="other">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="previous_value">Valor Anterior</Label>
                <Input
                  id="previous_value"
                  value={formData.previous_value}
                  onChange={(e) => setFormData({ ...formData, previous_value: e.target.value })}
                  placeholder="Ex: 10,75%"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="forecast_value">Previsão</Label>
                <Input
                  id="forecast_value"
                  value={formData.forecast_value}
                  onChange={(e) => setFormData({ ...formData, forecast_value: e.target.value })}
                  placeholder="Ex: 10,50%"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEvent} disabled={!formData.title || !formData.event_date}>
              {editingEvent ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PremiumPageLayout>
  );
};

export default CalendarioEconomico;
