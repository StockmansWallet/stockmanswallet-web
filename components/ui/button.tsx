import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "teal";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-dark active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-sm",
  secondary:
    "ring-1 ring-inset ring-white/15 bg-white/5 text-text-primary hover:bg-white/10 active:scale-[0.97]",
  ghost:
    "text-text-secondary hover:bg-white/8 hover:text-text-primary",
  destructive:
    "bg-red-500/15 text-red-400 hover:bg-red-500/25 active:scale-[0.97]",
  teal:
    "bg-teal-500 text-white hover:bg-teal-600 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-sm",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 rounded-full px-3.5 text-[13px]",
  md: "h-9 rounded-full px-4 text-[13px]",
  lg: "h-11 rounded-full px-5 text-[14px]",
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
