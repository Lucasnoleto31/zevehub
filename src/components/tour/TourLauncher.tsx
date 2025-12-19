import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTour } from '@/contexts/TourContext';
import { allTours } from '@/data/tourSteps';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  HelpCircle, 
  Play, 
  Sparkles, 
  BookOpen, 
  Zap,
  GraduationCap,
  Clock,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TourOption {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  duration: string;
  color: string;
  tour: typeof allTours.main;
}

const tourOptions: TourOption[] = [
  {
    id: 'main',
    name: 'Tour Completo',
    description: 'Conheça todas as funcionalidades do sistema passo a passo',
    icon: GraduationCap,
    duration: '~5 min',
    color: 'from-blue-500 to-indigo-500',
    tour: allTours.main,
  },
  {
    id: 'dashboard',
    name: 'Tour do Dashboard',
    description: 'Aprenda a interpretar todas as métricas e gráficos',
    icon: BookOpen,
    duration: '~2 min',
    color: 'from-emerald-500 to-teal-500',
    tour: allTours.dashboard,
  },
  {
    id: 'quick',
    name: 'Tour Rápido',
    description: 'Uma visão geral rápida das principais funcionalidades',
    icon: Zap,
    duration: '~1 min',
    color: 'from-amber-500 to-orange-500',
    tour: allTours.quick,
  },
];

export const TourLauncher: React.FC = () => {
  const { startTour, isActive } = useTour();
  const [open, setOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState<string | null>(null);

  const handleStartTour = (tour: typeof allTours.main) => {
    setOpen(false);
    setTimeout(() => {
      startTour(tour);
    }, 300);
  };

  if (isActive) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "w-14 h-14 rounded-full",
            "bg-gradient-to-r from-primary to-primary/80",
            "flex items-center justify-center",
            "shadow-lg shadow-primary/25",
            "border border-primary/20",
            "transition-all duration-300",
            "hover:shadow-xl hover:shadow-primary/30"
          )}
          data-tour="tour-button"
        >
          <HelpCircle className="w-6 h-6 text-primary-foreground" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5 text-white" />
          </span>
        </motion.button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Central de Ajuda</DialogTitle>
              <DialogDescription>
                Escolha um tour para aprender a usar o sistema
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {tourOptions.map((option) => (
            <motion.button
              key={option.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedTour(option.id === selectedTour ? null : option.id)}
              className={cn(
                "w-full p-4 rounded-xl border transition-all duration-300 text-left",
                selectedTour === option.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 bg-card"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0",
                  option.color
                )}>
                  <option.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">{option.name}</h4>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {option.duration}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
                <ChevronRight className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform flex-shrink-0",
                  selectedTour === option.id && "rotate-90"
                )} />
              </div>

              <AnimatePresence>
                {selectedTour === option.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 mt-4 border-t border-border">
                      <div className="flex items-center justify-between text-sm mb-3">
                        <span className="text-muted-foreground">
                          {option.tour.steps.length} passos
                        </span>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartTour(option.tour);
                        }}
                        className="w-full gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Iniciar Tour
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground">
            💡 Dica: Você pode reiniciar o tour a qualquer momento clicando no botão de ajuda
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
