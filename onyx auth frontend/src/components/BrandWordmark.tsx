import { cn } from "@/lib/utils";

/**
 * BrandWordmark — single source of truth for the "Dexter Auth" wordmark.
 *
 * Uses the Space Grotesk display font (`font-display`) and, when `animated`
 * (default), paints the text with a slow primary-tinted gradient shimmer that
 * sweeps across on a loop. Theme-aware: the gradient runs from `foreground`
 * through `primary` and back, so it reads cleanly in both light and dark mode.
 *
 * The gradient text is layered on top of a solid `text-foreground` base so the
 * wordmark still renders legibly if `backdrop-clip: text` is unsupported.
 */
const BrandWordmark = ({
  className,
  animated = true,
}: {
  className?: string;
  animated?: boolean;
}) => {
  return (
    <span
      className={cn(
        "relative font-display font-bold tracking-tight text-foreground",
        animated &&
          "bg-[length:200%_auto] bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent animate-shimmer",
        className
      )}
    >
      Dexter Auth
    </span>
  );
};

export default BrandWordmark;
