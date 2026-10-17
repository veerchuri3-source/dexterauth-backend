import * as React from "react";
import { useState, useEffect } from "react";
import { motion, useAnimation } from "motion/react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  delay?: number;
  showPasswordToggle?: boolean;
}

export const AnimatedInput = React.forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ className, type, label, delay = 0, showPasswordToggle = false, value, onChange, ...props }, ref) => {
    const { onAnimationStart, onDragStart, onDragEnd, onDrag, ...inputProps } = props;
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const controls = useAnimation();

    // Trigger typing pulse when value changes
    useEffect(() => {
      if (!value) return;
      setIsTyping(true);
      
      // Small scale bounce on input to make typing feel tactile
      controls.start({
        scale: [1, 1.006, 1],
        transition: { duration: 0.15, ease: "easeOut" }
      });

      const timeout = setTimeout(() => setIsTyping(false), 300);
      return () => clearTimeout(timeout);
    }, [value, controls]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      if (props.onFocus) props.onFocus(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      if (props.onBlur) props.onBlur(e);
    };

    const inputType = showPasswordToggle ? (showPassword ? "text" : "password") : type;

    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: delay, ease: [0.215, 0.61, 0.355, 1] }}
        className="space-y-1.5 w-full font-inter"
      >
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 block select-none pl-0.5">{label}</label>
        <div className="relative">
          {/* Animated glow background behind the input */}
          <motion.div
            className="absolute -inset-[3px] rounded-[14px] bg-gradient-to-r from-primary/50 to-primary/30 blur-md -z-10"
            animate={{
              opacity: isFocused ? (isTyping ? 0.85 : 0.5) : 0,
              scale: isFocused ? (isTyping ? 1.015 : 1) : 0.98,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
          />

          <motion.input
            ref={ref}
            type={inputType}
            value={value}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            animate={controls}
            className={cn(
              "w-full rounded-xl border border-white/10 bg-[#0B0F19]/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-all duration-200",
              isFocused ? "border-primary/60 bg-background/90 ring-1 ring-primary/20 shadow-lg shadow-primary/5" : "hover:border-white/15",
              showPasswordToggle ? "pr-11" : "",
              className
            )}
            {...inputProps}
          />
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-[52%] -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
      </motion.div>
    );
  }
);

AnimatedInput.displayName = "AnimatedInput";
