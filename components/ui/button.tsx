import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-dark active:scale-[0.98] disabled:opacity-50",
  secondary:
    "ring-1 ring-inset ring-white/15 bg-white/5 text-text-primary hover:bg-white/10 active:scale-[0.98]",
  ghost:
    "text-text-secondary hover:bg-white/8 hover:text-text-primary",
  destructive:
    "bg-red-500/15 text-red-400 hover:bg-red-500/25 active:scale-[0.98]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "rounded-xl px-3 py-1.5 text-xs",
  md: "rounded-2xl px-5 py-2.5 text-sm",
  lg: "rounded-2xl px-6 py-3.5 text-sm",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center font-semibold transition-all duration-150 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
