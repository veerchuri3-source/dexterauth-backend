import React, { useState, useCallback, ReactNode } from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'motion/react';
import { DialogContext, ConfirmDialogOptions, AlertDialogOptions, PromptDialogOptions } from '../../hooks/use-dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface DialogState {
  isOpen: boolean;
  type: 'confirm' | 'alert' | 'prompt' | null;
  options: any;
  resolve: ((value: any) => void) | null;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>({
    isOpen: false,
    type: null,
    options: null,
    resolve: null,
  });

  const [promptValue, setPromptValue] = useState("");

  const closeDialog = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleResolve = useCallback(
    (value: any) => {
      if (state.resolve) {
        state.resolve(value);
      }
      closeDialog();
    },
    [state, closeDialog]
  );

  const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        type: 'confirm',
        options,
        resolve,
      });
    });
  }, []);

  const alert = useCallback((options: AlertDialogOptions): Promise<void> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        type: 'alert',
        options,
        resolve,
      });
    });
  }, []);

  const prompt = useCallback((options: PromptDialogOptions): Promise<string | null> => {
    setPromptValue(options.defaultValue || "");
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        type: 'prompt',
        options,
        resolve,
      });
    });
  }, []);

  // Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const contentVariants = {
    hidden: { opacity: 0, scale: 0.95, y: -10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.2 } },
  };

  return (
    <DialogContext.Provider value={{ confirm, alert, prompt }}>
      {children}

      {/* Confirm & Alert Dialogs */}
      <AlertDialogPrimitive.Root open={state.isOpen && (state.type === 'confirm' || state.type === 'alert')} onOpenChange={(open) => {
          if (!open && state.isOpen) handleResolve(false); // Handle ESC or outside click
      }}>
        <AnimatePresence>
          {state.isOpen && (state.type === 'confirm' || state.type === 'alert') && (
            <AlertDialogPrimitive.Portal forceMount>
              <AlertDialogPrimitive.Overlay asChild forceMount>
                <motion.div
                  variants={overlayVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="fixed inset-0 z-[100] bg-background/80 dark:bg-black/60 backdrop-blur-sm"
                />
              </AlertDialogPrimitive.Overlay>
              <AlertDialogPrimitive.Content asChild forceMount>
                <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-0">
                  <motion.div
                    variants={contentVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="w-full max-w-md overflow-hidden rounded-2xl bg-card dark:bg-[#0F172A]/90 border border-border dark:border-slate-800 p-6 shadow-2xl backdrop-blur-xl"
                  >
                    <AlertDialogPrimitive.Title className="text-lg font-semibold text-foreground dark:text-slate-100">
                      {state.options?.title}
                    </AlertDialogPrimitive.Title>
                    {state.options?.description && (
                      <AlertDialogPrimitive.Description className="mt-2 text-sm text-muted-foreground dark:text-slate-400">
                        {state.options.description}
                      </AlertDialogPrimitive.Description>
                    )}
                    <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                      {state.type === 'confirm' && (
                        <AlertDialogPrimitive.Cancel asChild>
                          <Button
                            variant="ghost"
                            onClick={() => handleResolve(false)}
                            className="w-full sm:w-auto text-muted-foreground dark:text-slate-300 hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-slate-800"
                          >
                            {state.options?.cancelText || "Cancel"}
                          </Button>
                        </AlertDialogPrimitive.Cancel>
                      )}
                      <AlertDialogPrimitive.Action asChild>
                        <Button
                          onClick={() => handleResolve(true)}
                          className={`w-full sm:w-auto ${
                            state.options?.variant === 'destructive'
                              ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
                              : "bg-primary hover:bg-primary text-white shadow-lg shadow-primary/20"
                          }`}
                        >
                          {state.options?.confirmText || "Confirm"}
                        </Button>
                      </AlertDialogPrimitive.Action>
                    </div>
                  </motion.div>
                </div>
              </AlertDialogPrimitive.Content>
            </AlertDialogPrimitive.Portal>
          )}
        </AnimatePresence>
      </AlertDialogPrimitive.Root>

      {/* Prompt Dialog */}
      <DialogPrimitive.Root open={state.isOpen && state.type === 'prompt'} onOpenChange={(open) => {
          if (!open && state.isOpen) handleResolve(null);
      }}>
        <AnimatePresence>
          {state.isOpen && state.type === 'prompt' && (
            <DialogPrimitive.Portal forceMount>
              <DialogPrimitive.Overlay asChild forceMount>
                <motion.div
                  variants={overlayVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="fixed inset-0 z-[100] bg-background/80 dark:bg-black/60 backdrop-blur-sm"
                />
              </DialogPrimitive.Overlay>
              <DialogPrimitive.Content asChild forceMount>
                <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-0">
                  <motion.div
                    variants={contentVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="w-full max-w-md overflow-hidden rounded-2xl bg-card dark:bg-[#0F172A]/90 border border-border dark:border-slate-800 p-6 shadow-2xl backdrop-blur-xl"
                  >
                    <DialogPrimitive.Title className="text-lg font-semibold text-foreground dark:text-slate-100">
                      {state.options?.title}
                    </DialogPrimitive.Title>
                    {state.options?.description && (
                      <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground dark:text-slate-400">
                        {state.options.description}
                      </DialogPrimitive.Description>
                    )}
                    
                    <div className="mt-4">
                      <Input
                        autoFocus
                        value={promptValue}
                        onChange={(e) => setPromptValue(e.target.value)}
                        placeholder={state.options?.placeholder}
                        className="bg-background dark:bg-[#020617] border-border dark:border-slate-800 text-foreground dark:text-slate-200 focus-visible:ring-primary/50"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleResolve(promptValue);
                          }
                        }}
                      />
                    </div>

                    <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                      <DialogPrimitive.Close asChild>
                        <Button
                          variant="ghost"
                          onClick={() => handleResolve(null)}
                          className="w-full sm:w-auto text-muted-foreground dark:text-slate-300 hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-slate-800"
                        >
                          {state.options?.cancelText || "Cancel"}
                        </Button>
                      </DialogPrimitive.Close>
                      <Button
                        onClick={() => handleResolve(promptValue)}
                        className="w-full sm:w-auto bg-primary hover:bg-primary text-white shadow-lg shadow-primary/20"
                      >
                        {state.options?.confirmText || "Submit"}
                      </Button>
                    </div>
                  </motion.div>
                </div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          )}
        </AnimatePresence>
      </DialogPrimitive.Root>

    </DialogContext.Provider>
  );
}
