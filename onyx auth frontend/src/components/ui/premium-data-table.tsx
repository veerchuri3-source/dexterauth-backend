import React, { ReactNode, forwardRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Plus } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";

interface SellerTableProps<T> {
  title: string;
  description?: string;
  data: T[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchPlaceholder?: string;
  primaryAction?: {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    disabled?: boolean;
  };
  actions?: ReactNode;
  columns: ReactNode;
  renderRow: (item: T, index: number) => ReactNode;
  emptyState?: ReactNode;
  footer?: ReactNode;
}

export function SellerTable<T extends { id: string | number }>({
  title,
  description,
  data,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  primaryAction,
  actions,
  columns,
  renderRow,
  emptyState,
  footer
}: SellerTableProps<T>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-xl shadow-2xl">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-primary/[0.02] to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full min-h-[400px]">
          {/* Header section */}
          <div className="relative z-20 border-b border-border bg-muted/30 backdrop-blur-sm p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{title}</h2>
                {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:flex-wrap gap-3 w-full md:w-auto md:overflow-visible">
                <div className="relative w-full md:w-[250px] shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-9 sm:pl-10 h-8 sm:h-10 text-xs sm:text-sm bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/70 focus-visible:border-primary/50 focus-visible:ring-primary/20 rounded-xl transition-all w-full"
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:flex-wrap gap-2 sm:gap-3 w-full md:w-auto">
                  {actions}
                  {primaryAction && (
                    <Button
                      onClick={primaryAction.onClick}
                      disabled={primaryAction.disabled}
                      className="font-medium transition-all h-10 sm:h-10 text-sm sm:text-sm w-full sm:w-auto shrink-0"
                    >
                      {primaryAction.icon}
                      {primaryAction.label}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Table section */}
          <div className={`flex-1 custom-scrollbar relative ${data.length > 0 ? 'overflow-x-auto' : 'overflow-hidden'}`}>
            <table className="w-full text-xs sm:text-sm text-left whitespace-nowrap min-w-max">
              <thead className="text-[10px] sm:text-xs uppercase bg-muted/40 backdrop-blur-md text-muted-foreground border-b border-border/50 sticky top-0 z-10 shadow-sm">
                <tr>
                  {columns}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {data.map((item, index) => renderRow(item, index))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {data.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center flex-1">
              {emptyState || (
                <div className="text-center">
                  <p className="text-muted-foreground text-lg mb-2">No data found</p>
                  <p className="text-muted-foreground/70 text-sm">Try adjusting your filters or search query.</p>
                </div>
              )}
            </div>
          )}

          {/* Footer section */}
          {footer && (
            <div className="border-t border-border bg-muted/30 backdrop-blur-sm p-4 mt-auto">
              {footer}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export const SellerTableRow = forwardRef<HTMLTableRowElement, { 
  children: ReactNode, 
  index: number, 
  className?: string 
}>(({ 
  children, 
  index, 
  className = "" 
}, ref) => {
  return (
    <motion.tr
      ref={ref}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
      className={`border-b border-border/40 hover:bg-primary/5 hover:border-primary/20 transition-all duration-300 group ${className}`}
    >
      {children}
    </motion.tr>
  );
});
