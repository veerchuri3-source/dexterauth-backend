import { createContext, useContext } from 'react';

export interface ConfirmDialogOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

export interface AlertDialogOptions {
  title: string;
  description?: string;
  confirmText?: string;
}

export interface PromptDialogOptions {
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
}

export interface DialogContextType {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  alert: (options: AlertDialogOptions) => Promise<void>;
  prompt: (options: PromptDialogOptions) => Promise<string | null>;
}

export const DialogContext = createContext<DialogContextType | null>(null);

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
