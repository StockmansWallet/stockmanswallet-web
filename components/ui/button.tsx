import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive"
  | "teal"
  | "indigo"
  | "lime"
  | "sky"
  | "amber"
  | "purple"
  | "advisor"
  | "simulator"
  | "brangus"
  | "insights"
  | "markets"
  | "yard-book"
  | "reports"
  | "freight-iq"
  | "grid-iq"
  | "ch40";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-dark active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-sm",
  secondary: "bg-surface-high text-text-secondary hover:bg-surface-raised active:scale-[0.97]",
  ghost: "text-text-secondary hover:bg-surface-raised hover:text-text-primary",
  destructive:
    "bg-error text-white hover:bg-error-dark active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-sm",
  teal: "bg-teal text-black hover:bg-teal-dark active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-sm",
  indigo:
    "bg-indigo text-white hover:bg-indigo-dark active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-sm",
  lime: "bg-emerald text-black hover:bg-emerald-dark active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-sm",
  sky: "bg-sky text-white hover:bg-sky-dark active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-sm",
  amber:
    "bg-gold text-black hover:bg-gold-dark active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-sm",
  purple:
    "bg-violet text-white hover:bg-violet-dark active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-sm",
  advisor:
    "bg-indigo text-white hover:bg-indigo-dark active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-sm",
  simulator:
    "bg-red text-white hover:bg-red-dark active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-sm",
  brangus:
    "bg-brangus text-white hover:bg-brangus-dark active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-sm",
  insights:
    "bg-insights text-white hover:bg-insights-dark active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-sm",
  markets:
    "bg-markets text-white hover:bg-markets-dark active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-sm",
  "yard-book":
    "bg-yard-book text-white hover:bg-yard-book-dark active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-sm",
  reports:
    "bg-reports text-white hover:bg-reports-dark active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-sm",
  "freight-iq":
    "bg-freight-iq-dark text-white hover:bg-freight-iq-text active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-sm",
  "grid-iq":
    "bg-grid-iq text-white hover:bg-grid-iq-dark active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-sm",
  "ch40":
    "bg-ch40 text-white hover:bg-ch40-dark active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-sm",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 rounded-full px-4 text-[13px]",
  md: "h-9 rounded-full px-5 text-[13px]",
  lg: "h-11 rounded-full px-6 text-[14px]",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex cursor-pointer items-center justify-center font-semibold transition-colors duration-150 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
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
