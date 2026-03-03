import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl bg-white/5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-5 pt-5 pb-4 ${className}`}>
      {children}
    </div>
  );
}

function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`text-sm font-semibold text-text-primary ${className}`}>
      {children}
    </h2>
  );
}

function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className ?? "px-5 pb-5"}>{children}</div>;
}

export { Card, CardHeader, CardTitle, CardContent };
export type { CardProps };
