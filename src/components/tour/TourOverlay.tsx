import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTour } from '@/contexts/TourContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Sparkles,
  CheckCircle2,
  Circle
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
        const padding = 8;
        
        setHighlightRect({
          top: rect.top - padding + window.scrollY,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });

        // Calculate tooltip position
        const tooltipWidth = 380;
        const tooltipHeight = 250;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let top = rect.bottom + 20 + window.scrollY;
        let left = rect.left + rect.width / 2 - tooltipWidth / 2;

        // Adjust based on placement
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
          default:
            // bottom is default
            break;
        }

        // Keep within viewport
        if (left < 20) left = 20;
        if (left + tooltipWidth > viewportWidth - 20) left = viewportWidth - tooltipWidth - 20;
        if (top < 20 + window.scrollY) top = rect.bottom + 20 + window.scrollY;

        setTooltipPosition({ top, left });

        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // No target element, show centered tooltip
        setHighlightRect(null);
        setTooltipPosition({
          top: window.innerHeight / 2 - 125 + window.scrollY,
          left: window.innerWidth / 2 - 190,
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isActive, currentStep]);

  if (!isActive || !currentStep || !currentTour) return null;

  const isLastStep = currentStepIndex === currentTour.steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  return (
    <AnimatePresence>
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
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#tour-mask)"
          />
        </svg>

        {/* Highlight border with glow */}
        {highlightRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute pointer-events-none"
            style={{
              top: highlightRect.top,
              left: highlightRect.left,
              width: highlightRect.width,
              height: highlightRect.height,
            }}
          >
            <div className="absolute inset-0 rounded-xl border-2 border-primary animate-pulse" />
            <div className="absolute inset-0 rounded-xl shadow-[0_0_30px_rgba(var(--primary),0.5)]" />
          </motion.div>
        )}

        {/* Tooltip */}
        <motion.div
          ref={tooltipRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute pointer-events-auto w-[380px]"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/20 to-primary/5 px-5 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    Passo {currentStepIndex + 1} de {currentTour.steps.length}
                  </span>
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
              <Progress value={progress} className="h-1 mt-3" />
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
                      "transition-all duration-300",
                      index === currentStepIndex 
                        ? "w-6 h-2 rounded-full bg-primary" 
                        : index < currentStepIndex
                        ? "w-2 h-2 rounded-full bg-primary/50"
                        : "w-2 h-2 rounded-full bg-muted"
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
                  "gap-1 rounded-lg",
                  isFirstStep && "opacity-0 pointer-events-none"
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Button>

              <Button
                size="sm"
                onClick={isLastStep ? endTour : nextStep}
                className="gap-1 rounded-lg bg-primary hover:bg-primary/90 min-w-[100px]"
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
      </div>
    </AnimatePresence>
  );
};
