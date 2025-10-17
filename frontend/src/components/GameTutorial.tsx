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
      title: "Mesaj Gönder",
      description: "Buradan AI meslektaşına mesaj gönderebilirsin. Olay yerinde nereye bakmasını söyle!",
      position: "top"
    },
    {
      target: ".case-info-panel", // Case info panel (desktop) or button (mobile)
      title: "Vaka Bilgileri",
      description: "Burada şüpheliler, kanıtlar ve vaka detaylarını görebilirsin. Kanıtlar konuşmalar sırasında açılır!",
      position: "bottom"
    },
    {
      target: "button[aria-label='Back to Cases']", // Exit button
      title: "Çıkış",
      description: "Bu buton ile vaka listesine geri dönebilirsin.",
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

  // Calculate tooltip position
  const getTooltipStyle = () => {
    const tooltipWidth = 320;
    const tooltipHeight = 150;
    const padding = 20;

    let top = 0;
    let left = 0;

    if (currentStepData.position === "top") {
      // Tooltip above the target
      top = targetRect.top - tooltipHeight - padding;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    } else if (currentStepData.position === "bottom") {
      // Tooltip below the target
      top = targetRect.bottom + padding;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    } else {
      // Center
      top = window.innerHeight / 2 - tooltipHeight / 2;
      left = window.innerWidth / 2 - tooltipWidth / 2;
    }

    // Keep tooltip in viewport
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
      {/* Dark Overlay */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        style={{ zIndex: 10000 }}
      />

      {/* Spotlight for target element */}
      <div
        className="fixed border-4 border-primary/50 rounded-lg pointer-events-none"
        style={{
          top: `${targetRect.top - 4}px`,
          left: `${targetRect.left - 4}px`,
          width: `${targetRect.width + 8}px`,
          height: `${targetRect.height + 8}px`,
          zIndex: 10001,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.7)"
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
