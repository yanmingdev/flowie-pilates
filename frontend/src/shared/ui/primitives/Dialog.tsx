import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../../utils/class-names';
export const Dialog = DialogPrimitive.Root;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(
  /** 將外部 ref 傳遞給底層可及性元件，保留原有 props。 */ ({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay ref={ref} className={cn('dialog-overlay', className)} {...props} />
  ),
);
DialogOverlay.displayName = 'DialogOverlay';
export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(
  /** 將外部 ref 傳遞給底層可及性元件，保留原有 props。 */ ({ className, ...props }, ref) => (
    <DialogPrimitive.Content
      ref={ref}
      className={cn('dialog-content modal', className)}
      {...props}
    />
  ),
);
DialogContent.displayName = 'DialogContent';
