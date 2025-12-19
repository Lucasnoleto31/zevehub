import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTour } from '@/contexts/TourContext';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const TourOverlay: React.FC = () => {
  const { 
    isActive, 
    currentStep, 
    currentStepIndex, 
    currentTour,
    nextStep, 
    prevStep, 
    skipTour,
    endTour,
    progress 
  } = useTour();
  
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !currentStep) {
      setHighlightRect(null);
      return;
    }

    const updatePosition = () => {
      const element = document.querySelector(currentStep.target);
      
      if (element) {
        const rect = element.getBoundingClientRect();
        const padding = 12;
        
        setHighlightRect({
          top: rect.top - padding + window.scrollY,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });

        const tooltipWidth = 380;
        const tooltipHeight = 260;
        const viewportWidth = window.innerWidth;
        
        let top = rect.bottom + 20 + window.scrollY;
        let left = rect.left + rect.width / 2 - tooltipWidth / 2;

        switch (currentStep.placement) {
          case 'top':
            top = rect.top - tooltipHeight - 20 + window.scrollY;
            break;
          case 'left':
            top = rect.top + rect.height / 2 - tooltipHeight / 2 + window.scrollY;
            left = rect.left - tooltipWidth - 20;
            break;
          case 'right':
            top = rect.top + rect.height / 2 - tooltipHeight / 2 + window.scrollY;
            left = rect.right + 20;
            break;
        }

        if (left < 20) left = 20;
        if (left + tooltipWidth > viewportWidth - 20) left = viewportWidth - tooltipWidth - 20;
        if (top < 20 + window.scrollY) top = rect.bottom + 20 + window.scrollY;

        setTooltipPosition({ top, left });
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setHighlightRect(null);
        setTooltipPosition({
          top: window.innerHeight / 2 - 130 + window.scrollY,
          left: window.innerWidth / 2 - 190,
        });
      }
    };

    const timer = setTimeout(updatePosition, 100);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isActive, currentStep, currentStepIndex]);

  if (!isActive || !currentStep || !currentTour) return null;

  const isLastStep = currentStepIndex === currentTour.steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dark overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto">
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {highlightRect && (
              <rect
                x={highlightRect.left}
                y={highlightRect.top}
                width={highlightRect.width}
                height={highlightRect.height}
                rx="16"
                fill="black"
                className="transition-all duration-300 ease-out"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.8)"
          mask="url(#tour-mask)"
          className="transition-opacity duration-300"
        />
      </svg>

      {/* Highlight border */}
      {highlightRect && (
        <div
          className="absolute pointer-events-none transition-all duration-300 ease-out"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
          }}
        >
          <div className="absolute -inset-1 rounded-2xl bg-primary/30 blur-lg animate-pulse" />
          <div className="absolute inset-0 rounded-2xl border-2 border-primary" />
        </div>
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepIndex}
          ref={tooltipRef}
          initial={{ opacity: 0, y: 15, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="absolute pointer-events-auto w-[380px]"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
        >
          <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/15 to-transparent px-5 py-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-foreground">
                      Passo {currentStepIndex + 1} de {currentTour.steps.length}
                    </span>
                    <p className="text-xs text-muted-foreground">Tour do Sistema</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                  onClick={skipTour}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Progress bar */}
              <div className="mt-3 h-1 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              <h3 className="text-lg font-bold text-foreground mb-2">
                {currentStep.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentStep.content}
              </p>
            </div>

            {/* Step indicators */}
            <div className="px-5 pb-3">
              <div className="flex items-center justify-center gap-1.5">
                {currentTour.steps.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      index === currentStepIndex 
                        ? "w-5 bg-primary" 
                        : index < currentStepIndex
                        ? "w-1.5 bg-primary/50"
                        : "w-1.5 bg-muted"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-2 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevStep}
                disabled={isFirstStep}
                className={cn(
                  "gap-1.5 rounded-lg",
                  isFirstStep && "opacity-0 pointer-events-none"
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Button>

              <Button
                size="sm"
                onClick={isLastStep ? endTour : nextStep}
                className={cn(
                  "gap-1.5 rounded-lg min-w-[110px]",
                  isLastStep 
                    ? "bg-emerald-600 hover:bg-emerald-700" 
                    : "bg-primary hover:bg-primary/90"
                )}
              >
                {isLastStep ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Concluir
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
