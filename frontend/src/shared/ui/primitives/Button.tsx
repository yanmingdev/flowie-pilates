import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/class-names';
const buttonVariants = cva('button', {
  variants: { variant: { default: '', secondary: 'secondary', danger: 'danger' } },
  defaultVariants: { variant: 'default' },
});
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  /** 將外部 ref 傳遞給底層可及性元件，保留原有 props。 */ (
    { className, variant, asChild = false, ...props },
    ref,
  ) => {
    const Component = asChild ? Slot : 'button';
    return (
      <Component className={cn(buttonVariants({ variant }), className)} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';
