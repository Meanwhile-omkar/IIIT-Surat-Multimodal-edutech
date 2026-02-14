import { CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
  description: string;
  href: string;
}

interface OnboardingStepperProps {
  currentStep: number;
  steps: Step[];
}

export function OnboardingStepper({ currentStep, steps }: OnboardingStepperProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-4">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isComplete = index < currentStep;
            const isCurrent = index === currentStep;
            const isLast = index === steps.length - 1;

            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                      isComplete
                        ? "bg-green-500 border-green-500 text-white"
                        : isCurrent
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-400"
                    )}
                  >
                    {isComplete ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <Circle className="h-6 w-6" />
                    )}
                  </div>
                  <div className="mt-2 text-center min-w-[100px]">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isCurrent
                          ? "text-blue-600 dark:text-blue-400"
                          : isComplete
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-500 dark:text-gray-400"
                      )}
                    >
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Connecting Line */}
                {!isLast && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-2 -mt-12 transition-colors",
                      isComplete
                        ? "bg-green-500"
                        : "bg-gray-200 dark:bg-gray-800"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Default steps for new users
export const defaultSteps: Step[] = [
  {
    id: "session",
    label: "Start Session",
    description: "Choose your study mode",
    href: "/start-session",
  },
  {
    id: "upload",
    label: "Upload Materials",
    description: "Add documents or YouTube links",
    href: "/upload",
  },
  {
    id: "concepts",
    label: "Extract Concepts",
    description: "Generate knowledge graph",
    href: "/concepts",
  },
  {
    id: "learn",
    label: "Begin Learning",
    description: "Start studying",
    href: "/learn",
  },
  {
    id: "progress",
    label: "Track Progress",
    description: "View dashboard",
    href: "/dashboard",
  },
];
