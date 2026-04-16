import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetId?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to AI Agent Platform! 🎉',
    description: 'Let\'s take a quick tour to help you get started with building intelligent AI agents.',
  },
  {
    id: 'agents',
    title: 'Create AI Agents',
    description: 'Start by creating your first AI agent. Configure its personality, model, and knowledge access.',
    targetId: 'nav-agents',
    position: 'right',
  },
  {
    id: 'knowledge',
    title: 'Build Your Knowledge Base',
    description: 'Upload documents to create a knowledge base. Your agents can reference this information for accurate responses.',
    targetId: 'nav-knowledge',
    position: 'right',
  },
  {
    id: 'workflows',
    title: 'Design Multi-Agent Workflows',
    description: 'Connect multiple agents in workflows where they collaborate to solve complex tasks.',
    targetId: 'nav-workflows',
    position: 'right',
  },
  {
    id: 'chat',
    title: 'Chat with Your Agents',
    description: 'Test and interact with your configured agents through the AI Chat interface.',
    targetId: 'nav-chat',
    position: 'right',
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🚀',
    description: 'Start exploring the platform and build your first AI agent. Visit the Help section anytime for guidance.',
  },
];

const ONBOARDING_KEY = 'onboarding_completed_v2';

export const useFloatingOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      const timer = setTimeout(() => setShowOnboarding(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setCurrentStep(0);
    setShowOnboarding(true);
  };

  const nextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return {
    showOnboarding,
    currentStep,
    totalSteps: ONBOARDING_STEPS.length,
    currentStepData: ONBOARDING_STEPS[currentStep],
    nextStep,
    prevStep,
    completeOnboarding,
    resetOnboarding,
  };
};

interface TooltipPosition {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}

interface FloatingTooltipProps {
  showOnboarding: boolean;
  currentStep: number;
  totalSteps: number;
  currentStepData: OnboardingStep;
  nextStep: () => void;
  prevStep: () => void;
  completeOnboarding: () => void;
}

export const FloatingTooltip: React.FC<FloatingTooltipProps> = ({
  showOnboarding,
  currentStep,
  totalSteps,
  currentStepData,
  nextStep,
  prevStep,
  completeOnboarding,
}) => {
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({});
  const [arrowPosition, setArrowPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('left');
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showOnboarding || !currentStepData.targetId) {
      // Center the tooltip for steps without targets
      setTooltipPosition({});
      return;
    }

    const targetElement = document.getElementById(currentStepData.targetId);
    if (!targetElement) {
      setTooltipPosition({});
      return;
    }

    const updatePosition = () => {
      const rect = targetElement.getBoundingClientRect();
      const tooltipWidth = 320;
      const tooltipHeight = 200;
      const offset = 16;

      let newPosition: TooltipPosition = {};
      let arrow: 'top' | 'bottom' | 'left' | 'right' = 'left';

      switch (currentStepData.position) {
        case 'right':
          newPosition = {
            top: rect.top + rect.height / 2 - tooltipHeight / 2,
            left: rect.right + offset,
          };
          arrow = 'left';
          break;
        case 'left':
          newPosition = {
            top: rect.top + rect.height / 2 - tooltipHeight / 2,
            left: rect.left - tooltipWidth - offset,
          };
          arrow = 'right';
          break;
        case 'bottom':
          newPosition = {
            top: rect.bottom + offset,
            left: rect.left + rect.width / 2 - tooltipWidth / 2,
          };
          arrow = 'top';
          break;
        case 'top':
          newPosition = {
            top: rect.top - tooltipHeight - offset,
            left: rect.left + rect.width / 2 - tooltipWidth / 2,
          };
          arrow = 'bottom';
          break;
        default:
          newPosition = {
            top: rect.top + rect.height / 2 - tooltipHeight / 2,
            left: rect.right + offset,
          };
          arrow = 'left';
      }

      // Clamp to viewport
      const padding = 20;
      if (newPosition.top !== undefined) {
        newPosition.top = Math.max(padding, Math.min(window.innerHeight - tooltipHeight - padding, newPosition.top));
      }
      if (newPosition.left !== undefined) {
        newPosition.left = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, newPosition.left));
      }

      setTooltipPosition(newPosition);
      setArrowPosition(arrow);

      // Highlight the target element
      targetElement.classList.add('onboarding-highlight');
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      const el = document.getElementById(currentStepData.targetId!);
      if (el) el.classList.remove('onboarding-highlight');
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [showOnboarding, currentStepData]);

  if (!showOnboarding) return null;

  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const isCentered = !currentStepData.targetId;

  const arrowStyles: Record<string, string> = {
    left: 'left-0 top-1/2 -translate-x-full -translate-y-1/2 border-r-primary border-t-transparent border-b-transparent border-l-transparent',
    right: 'right-0 top-1/2 translate-x-full -translate-y-1/2 border-l-primary border-t-transparent border-b-transparent border-r-transparent',
    top: 'top-0 left-1/2 -translate-y-full -translate-x-1/2 border-b-primary border-l-transparent border-r-transparent border-t-transparent',
    bottom: 'bottom-0 left-1/2 translate-y-full -translate-x-1/2 border-t-primary border-l-transparent border-r-transparent border-b-transparent',
  };

  return (
    <AnimatePresence>
      {/* Backdrop for centered modals */}
      {isCentered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99] bg-background/80 backdrop-blur-sm"
          onClick={completeOnboarding}
        />
      )}
      
      {/* Tooltip */}
      <motion.div
        ref={tooltipRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`fixed z-[100] w-80 ${isCentered ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}`}
        style={isCentered ? {} : tooltipPosition}
      >
        <Card className="p-5 shadow-2xl border-primary/30 bg-card relative">
          {/* Arrow indicator for positioned tooltips */}
          {!isCentered && (
            <div
              className={`absolute w-0 h-0 border-8 ${arrowStyles[arrowPosition]}`}
            />
          )}
          
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                Step {currentStep + 1} of {totalSteps}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-1"
              onClick={completeOnboarding}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <h3 className="text-lg font-semibold mb-2">{currentStepData.title}</h3>
          <p className="text-muted-foreground text-sm mb-5">
            {currentStepData.description}
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStep
                    ? 'w-6 bg-primary'
                    : i < currentStep
                    ? 'w-1.5 bg-primary/50'
                    : 'w-1.5 bg-muted'
                }`}
              />
            ))}
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={isFirst}
              className="gap-1"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            
            {isLast ? (
              <Button onClick={completeOnboarding} className="gap-1" size="sm">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={nextStep} className="gap-1" size="sm">
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          <button
            onClick={completeOnboarding}
            className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip tour
          </button>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
