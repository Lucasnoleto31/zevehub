import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface TourStep {
  id: string;
  target: string; // CSS selector
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  page?: string; // Route to navigate to
  action?: () => void;
  highlight?: boolean;
}

export interface Tour {
  id: string;
  name: string;
  steps: TourStep[];
}

interface TourContextType {
  isActive: boolean;
  currentTour: Tour | null;
  currentStepIndex: number;
  currentStep: TourStep | null;
  startTour: (tour: Tour) => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  skipTour: () => void;
  progress: number;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};

interface TourProviderProps {
  children: ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentTour, setCurrentTour] = useState<Tour | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = currentTour?.steps[currentStepIndex] || null;
  const progress = currentTour ? ((currentStepIndex + 1) / currentTour.steps.length) * 100 : 0;

  const startTour = useCallback((tour: Tour) => {
    setCurrentTour(tour);
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  const endTour = useCallback(() => {
    setIsActive(false);
    setCurrentTour(null);
    setCurrentStepIndex(0);
    localStorage.setItem('tour_completed', 'true');
  }, []);

  const skipTour = useCallback(() => {
    setIsActive(false);
    setCurrentTour(null);
    setCurrentStepIndex(0);
    localStorage.setItem('tour_skipped', 'true');
  }, []);

  const nextStep = useCallback(() => {
    if (currentTour && currentStepIndex < currentTour.steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      currentTour.steps[nextIndex]?.action?.();
    } else {
      endTour();
    }
  }, [currentTour, currentStepIndex, endTour]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }, [currentStepIndex]);

  const goToStep = useCallback((index: number) => {
    if (currentTour && index >= 0 && index < currentTour.steps.length) {
      setCurrentStepIndex(index);
    }
  }, [currentTour]);

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentTour,
        currentStepIndex,
        currentStep,
        startTour,
        endTour,
        nextStep,
        prevStep,
        goToStep,
        skipTour,
        progress,
      }}
    >
      {children}
    </TourContext.Provider>
  );
};
