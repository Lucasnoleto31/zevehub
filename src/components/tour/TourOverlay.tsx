import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useSpring } from 'framer-motion';
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

// Smooth spring configurations
const springConfig = { stiffness: 300, damping: 30, mass: 1 };

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
  const prevStepIndex = useRef(currentStepIndex);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Animated values for smooth highlight transitions
  const highlightTop = useSpring(0, springConfig);
  const highlightLeft = useSpring(0, springConfig);
  const highlightWidth = useSpring(0, springConfig);
  const highlightHeight = useSpring(0, springConfig);

  useEffect(() => {
    prevStepIndex.current = currentStepIndex;
  }, [currentStepIndex]);

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
        
        const newRect = {
          top: rect.top - padding + window.scrollY,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        };
        
        setHighlightRect(newRect);
        
        // Animate highlight position
        highlightTop.set(newRect.top);
        highlightLeft.set(newRect.left);
        highlightWidth.set(newRect.width);
        highlightHeight.set(newRect.height);

        // Calculate tooltip position
        const tooltipWidth = 400;
        const tooltipHeight = 280;
        const viewportWidth = window.innerWidth;
        
        let top = rect.bottom + 24 + window.scrollY;
        let left = rect.left + rect.width / 2 - tooltipWidth / 2;

        // Adjust based on placement
        switch (currentStep.placement) {
          case 'top':
            top = rect.top - tooltipHeight - 24 + window.scrollY;
            break;
          case 'left':
            top = rect.top + rect.height / 2 - tooltipHeight / 2 + window.scrollY;
            left = rect.left - tooltipWidth - 24;
            break;
          case 'right':
            top = rect.top + rect.height / 2 - tooltipHeight / 2 + window.scrollY;
            left = rect.right + 24;
            break;
          default:
            break;
        }

        // Keep within viewport
        if (left < 20) left = 20;
        if (left + tooltipWidth > viewportWidth - 20) left = viewportWidth - tooltipWidth - 20;
        if (top < 20 + window.scrollY) top = rect.bottom + 24 + window.scrollY;

        setTooltipPosition({ top, left });

        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setHighlightRect(null);
        setTooltipPosition({
          top: window.innerHeight / 2 - 140 + window.scrollY,
          left: window.innerWidth / 2 - 200,
        });
      }
    };

    // Small delay to allow for DOM updates
    const timer = setTimeout(updatePosition, 50);
    
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isActive, currentStep, highlightTop, highlightLeft, highlightWidth, highlightHeight]);

  if (!isActive || !currentStep || !currentTour) return null;

  const isLastStep = currentStepIndex === currentTour.steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key="tour-overlay"
        className="fixed inset-0 z-[9999] pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Animated dark overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <mask id="tour-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {highlightRect && (
                  <motion.rect
                    x={highlightLeft}
                    y={highlightTop}
                    width={highlightWidth}
                    height={highlightHeight}
                    rx="16"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <motion.rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.8)"
              mask="url(#tour-mask)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            />
          </svg>
        </motion.div>

        {/* Animated highlight border with glow effect */}
        <AnimatePresence mode="wait">
          {highlightRect && (
            <motion.div
              key={`highlight-${currentStepIndex}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ 
                type: "spring" as const, 
                stiffness: 300, 
                damping: 25, 
                mass: 0.5 
              }}
              className="absolute pointer-events-none"
              style={{
                top: highlightTop,
                left: highlightLeft,
                width: highlightWidth,
                height: highlightHeight,
              }}
            >
              {/* Outer glow */}
              <motion.div 
                className="absolute -inset-2 rounded-2xl bg-primary/20 blur-xl"
                animate={{ 
                  opacity: [0.5, 0.8, 0.5],
                  scale: [1, 1.02, 1]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut" as const
                }}
              />
              
              {/* Animated border */}
              <motion.div 
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.5), hsl(var(--primary)))',
                  backgroundSize: '200% 100%',
                }}
                animate={{
                  backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear" as const
                }}
              >
                <div className="absolute inset-[2px] rounded-xl bg-background/50 backdrop-blur-sm" />
              </motion.div>

              {/* Corner accents */}
              {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                <motion.div
                  key={pos}
                  className={`absolute ${pos} w-4 h-4`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                >
                  <div className={cn(
                    "absolute w-4 h-1 bg-primary rounded-full",
                    pos.includes('top') ? 'top-0' : 'bottom-0',
                    pos.includes('left') ? 'left-0' : 'right-0'
                  )} />
                  <div className={cn(
                    "absolute w-1 h-4 bg-primary rounded-full",
                    pos.includes('top') ? 'top-0' : 'bottom-0',
                    pos.includes('left') ? 'left-0' : 'right-0'
                  )} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tooltip with smooth transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`tooltip-${currentStepIndex}`}
            ref={tooltipRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ 
              type: "spring" as const, 
              stiffness: 400, 
              damping: 30, 
              mass: 0.8 
            }}
            className="absolute pointer-events-auto w-[400px]"
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
            }}
          >
            <motion.div 
              className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
              layoutId="tour-tooltip"
            >
              {/* Header with gradient */}
              <motion.div 
                className="relative bg-gradient-to-r from-primary/15 via-primary/10 to-transparent px-6 py-5 border-b border-border/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {/* Animated background pattern */}
                <div className="absolute inset-0 overflow-hidden">
                  <motion.div
                    className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl"
                    animate={{ 
                      rotate: [0, 360],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      rotate: { duration: 20, repeat: Infinity, ease: "linear" as const },
                      scale: { duration: 4, repeat: Infinity, ease: "easeInOut" as const }
                    }}
                  />
                </div>

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div 
                      className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Sparkles className="w-5 h-5 text-primary" />
                    </motion.div>
                    <div>
                      <motion.span 
                        className="text-sm font-semibold text-foreground"
                        key={currentStepIndex}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring" as const, stiffness: 300 }}
                      >
                        Passo {currentStepIndex + 1} de {currentTour.steps.length}
                      </motion.span>
                      <p className="text-xs text-muted-foreground">Tour do Sistema</p>
                    </div>
                  </div>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
                      onClick={skipTour}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                </div>
                
                {/* Animated progress bar */}
                <div className="mt-4 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: "spring" as const, stiffness: 100, damping: 20 }}
                  />
                </div>
              </motion.div>

              {/* Content with staggered animations */}
              <AnimatePresence mode="wait">
                <motion.div 
                  key={`content-${currentStepIndex}`}
                  className="p-6"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ 
                    type: "spring" as const, 
                    stiffness: 300, 
                    damping: 25 
                  }}
                >
                  <motion.h3 
                    className="text-xl font-bold text-foreground mb-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, type: "spring" as const, stiffness: 400 }}
                  >
                    {currentStep.title}
                  </motion.h3>
                  <motion.p 
                    className="text-sm text-muted-foreground leading-relaxed"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, type: "spring" as const, stiffness: 400 }}
                  >
                    {currentStep.content}
                  </motion.p>
                </motion.div>
              </AnimatePresence>

              {/* Step indicators with animations */}
              <div className="px-6 pb-4">
                <div className="flex items-center justify-center gap-2">
                  {currentTour.steps.map((_, index) => (
                    <motion.div
                      key={index}
                      initial={false}
                      animate={{
                        width: index === currentStepIndex ? 24 : 8,
                        backgroundColor: index === currentStepIndex 
                          ? 'hsl(var(--primary))' 
                          : index < currentStepIndex 
                          ? 'hsl(var(--primary) / 0.5)' 
                          : 'hsl(var(--muted))',
                      }}
                      transition={{ type: "spring" as const, stiffness: 400, damping: 25 }}
                      className="h-2 rounded-full"
                    />
                  ))}
                </div>
              </div>

              {/* Footer with animated buttons */}
              <div className="px-6 pb-6 pt-2 flex items-center justify-between">
                <motion.div
                  initial={false}
                  animate={{ 
                    opacity: isFirstStep ? 0 : 1,
                    x: isFirstStep ? -10 : 0 
                  }}
                  transition={{ type: "spring" as const, stiffness: 300 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={prevStep}
                    disabled={isFirstStep}
                    className="gap-2 rounded-xl hover:bg-muted/80 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    size="sm"
                    onClick={isLastStep ? endTour : nextStep}
                    className={cn(
                      "gap-2 rounded-xl min-w-[120px] transition-all",
                      isLastStep 
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700" 
                        : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    )}
                  >
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={isLastStep ? 'finish' : 'next'}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2"
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
                      </motion.span>
                    </AnimatePresence>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
