import { clsx } from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
}

export default function LandingButton({
  variant = "primary",
  size = "md",
  href,
  onClick,
  className,
  children,
  type = "button",
  disabled = false,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-semibold rounded-full transition-colors duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary";

  const variants: Record<ButtonVariant, string> = {
    primary: "bg-brand text-white hover:bg-brand-dark",
    secondary: "border border-brand text-brand hover:bg-brand/10",
    ghost: "text-white/70 hover:text-white hover:bg-white/5",
  };

  const sizes: Record<ButtonSize, string> = {
    sm: "h-10 px-4 text-sm",
    md: "h-11 px-6 text-base",
    lg: "h-12 px-8 text-lg",
  };

  const classes = clsx(
    base,
    variants[variant],
    sizes[size],
    disabled && "opacity-50 cursor-not-allowed",
    className
  );

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes} disabled={disabled}>
      {children}
    </button>
  );
}
