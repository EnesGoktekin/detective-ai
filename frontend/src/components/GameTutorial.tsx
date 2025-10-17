import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TutorialStep {
  target: string; // CSS selector or special keyword
  title: string;
  description: string;
  position: "top" | "bottom" | "center";
}

interface GameTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GameTutorial({ isOpen, onClose }: GameTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Define tutorial steps
  const steps: TutorialStep[] = [
    {
      target: "button[type='submit']", // Send message button
      title: "Send Message",
      description: "Send messages to your AI colleague at the crime scene. Tell them where to investigate!",
      position: "top"
    },
    {
      target: ".case-info-panel", // Case info panel (desktop) or button (mobile)
      title: "Case Information",
      description: "View suspects, evidence, and case details here. Evidence unlocks automatically during conversations!",
      position: "bottom"
    },
    {
      target: "button[aria-label='Back to Cases']", // Exit button
      title: "Exit",
      description: "Return to the case list with this button.",
      position: "bottom"
    }
  ];

  // Calculate target element position
  useEffect(() => {
    if (!isOpen) return;

    const updateTargetPosition = () => {
      const step = steps[currentStep];
      let element: Element | null = null;

      if (step.target === ".case-info-panel") {
        // Special handling for case info panel
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
          // On mobile, target the Info button
          element = document.querySelector("button[aria-label='Open Case Info']");
        } else {
          // On desktop, target the entire panel
          element = document.querySelector(".w-full.md\\:w-\\[35\\%\\]");
        }
      } else {
        element = document.querySelector(step.target);
      }

      if (element) {
        setTargetRect(element.getBoundingClientRect());
      }
    };

    updateTargetPosition();
    window.addEventListener("resize", updateTargetPosition);
    return () => window.removeEventListener("resize", updateTargetPosition);
  }, [isOpen, currentStep]);

  if (!isOpen || !targetRect) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem("hasSeenTutorial", "true");
    onClose();
  };

  const currentStepData = steps[currentStep];

  // Calculate tooltip position with responsive logic
  const getTooltipStyle = () => {
    const isMobile = window.innerWidth < 768;
    const tooltipWidth = isMobile ? Math.min(300, window.innerWidth - 40) : 320;
    const tooltipHeight = 150;
    const padding = 20;

    let top = 0;
    let left = 0;

    // Step-specific positioning
    if (currentStep === 0) {
      // Step 1: Send button (bottom of screen)
      // Position tooltip above the button, centered
      top = targetRect.top - tooltipHeight - padding;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    } else if (currentStep === 1) {
      // Step 2: Case info (right side on desktop, button on mobile)
      if (isMobile) {
        // Mobile: Info button at top right
        // Position tooltip below and to the left
        top = targetRect.bottom + padding;
        left = targetRect.left - tooltipWidth + targetRect.width;
      } else {
        // Desktop: Large panel on right
        // Position tooltip to the left of the panel
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.left - tooltipWidth - padding;
      }
    } else if (currentStep === 2) {
      // Step 3: Exit button (top right)
      // Position tooltip below and to the left
      top = targetRect.bottom + padding;
      left = targetRect.left - tooltipWidth + targetRect.width;
    }

    // Ensure tooltip stays in viewport
    if (left < padding) left = padding;
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = window.innerWidth - tooltipWidth - padding;
    }
    if (top < padding) top = padding;
    if (top + tooltipHeight > window.innerHeight - padding) {
      top = window.innerHeight - tooltipHeight - padding;
    }

    return {
      position: "fixed" as const,
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      zIndex: 10002
    };
  };

  return (
    <>
      {/* Dark Overlay - 50% opacity */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        style={{ zIndex: 10000 }}
      />

      {/* Spotlight for target element - make it bright */}
      <div
        className="fixed border-4 border-primary rounded-lg pointer-events-none bg-transparent"
        style={{
          top: `${targetRect.top - 4}px`,
          left: `${targetRect.left - 4}px`,
          width: `${targetRect.width + 8}px`,
          height: `${targetRect.height + 8}px`,
          zIndex: 10001,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 193, 7, 0.5)"
        }}
      />

      {/* Tooltip */}
      <div
        style={getTooltipStyle()}
        className="bg-card border-2 border-primary rounded-lg shadow-xl p-6"
      >
        <h3 className="text-xl font-bold text-primary mb-2">
          {currentStepData.title}
        </h3>
        <p className="text-muted-foreground text-sm mb-6">
          {currentStepData.description}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Geri
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Step indicator */}
            <span className="text-xs text-muted-foreground">
              {currentStep + 1} / {steps.length}
            </span>

            {currentStep < steps.length - 1 ? (
              <Button
                variant="default"
                size="sm"
                onClick={handleNext}
              >
                İleri
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleFinish}
              >
                Anladım!
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
