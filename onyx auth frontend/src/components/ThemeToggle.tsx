import React, { useState, useEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const sync = () =>
      setDark(document.documentElement.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  const toggle = () => setTheme(dark ? "light" : "dark");

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative h-9 w-9 shrink-0 rounded-lg border border-border/60 bg-background/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Sun className="h-[1.15rem] w-[1.15rem] rotate-0 scale-100 text-foreground transition-all duration-500 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.15rem] w-[1.15rem] rotate-90 scale-0 text-foreground transition-all duration-500 dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
