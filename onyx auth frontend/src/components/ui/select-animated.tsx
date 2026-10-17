import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function SelectAnimated({ options, value, onChange, className, placeholder = "Select..." }: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative text-sm", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full h-10 px-3 bg-background border border-border rounded-lg text-left text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors hover:bg-muted dark:bg-[#0F172A] dark:border-[#1E293B] dark:text-white dark:hover:bg-[#1E293B]/50"
      >
        <span className={cn("truncate pr-2", !selectedOption ? "text-muted-foreground dark:text-[#475569]" : "text-foreground dark:text-white")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
          <ChevronDown className="w-4 h-4 text-muted-foreground dark:text-[#475569]" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-xl overflow-y-auto overflow-x-hidden max-h-60 py-1 chat-scrollbar dark:bg-[#0F172A] dark:border-[#1E293B]"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2 text-left transition-colors hover:bg-primary/10",
                  value === option.value ? "text-primary dark:text-primary bg-primary/5" : "text-muted-foreground dark:text-[#94A3B8]"
                )}
              >
                <span className="truncate pr-2">{option.label}</span>
                {value === option.value && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
