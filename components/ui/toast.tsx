import * as React from 'react';

// Minimal toast types to satisfy useToast hook
export interface ToastProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  variant?: 'default' | 'destructive';
}

export type ToastActionElement = React.ReactElement;
