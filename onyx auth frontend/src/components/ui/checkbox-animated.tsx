import * as React from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
  checked?: boolean;
}

export const CheckboxAnimated = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onChange, onCheckedChange, ...props }, ref) => {
    const [internalChecked, setInternalChecked] = React.useState(checked || false);

    const isChecked = checked !== undefined ? checked : internalChecked;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalChecked(e.target.checked);
      if (onChange) onChange(e);
      if (onCheckedChange) onCheckedChange(e.target.checked);
    };

    return (
      <div className={cn("relative flex items-center justify-center w-5 h-5 cursor-pointer", className)}>
        <input
          type="checkbox"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          ref={ref}
          checked={isChecked}
          onChange={handleChange}
          {...props}
        />
        <motion.div
          className="absolute inset-0 border-2 rounded-[4px]"
          animate={{
            backgroundColor: isChecked ? "#2563EB" : "transparent",
            borderColor: isChecked ? "#2563EB" : "#334155",
          }}
          transition={{ duration: 0.2 }}
        />
        <motion.svg
          initial={false}
          animate={{
            scale: isChecked ? 1 : 0,
            opacity: isChecked ? 1 : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 25,
          }}
          className="w-3.5 h-3.5 text-white z-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: isChecked ? 1 : 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </motion.svg>
      </div>
    );
  }
);

CheckboxAnimated.displayName = "CheckboxAnimated";
