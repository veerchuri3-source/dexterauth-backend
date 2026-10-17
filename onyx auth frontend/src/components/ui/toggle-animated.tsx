import * as React from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export function ToggleAnimated({ checked, onChange, className, disabled }: ToggleProps) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center w-10 h-6 p-1 rounded-full cursor-pointer transition-colors duration-300",
        checked ? "bg-primary" : "bg-[#1E293B]",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={() => !disabled && onChange(!checked)}
    >
      <div
        className={cn(
          "w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-500 ease-out",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </div>
  );
}
