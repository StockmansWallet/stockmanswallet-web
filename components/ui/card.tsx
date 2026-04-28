import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`relative rounded-2xl border border-white/[0.08] bg-white/[0.03] bg-clip-padding ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 pt-5 pb-4 ${className}`}>{children}</div>;
}

function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-text-primary text-sm font-semibold ${className}`}>{children}</h2>;
}

function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className ?? "px-5 pb-5"}>{children}</div>;
}

export { Card, CardHeader, CardTitle, CardContent };
export type { CardProps };
