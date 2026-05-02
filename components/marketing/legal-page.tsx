import type { ReactNode } from "react";

type LegalPageProps = {
  title: string;
  eyebrow: string;
  children: ReactNode;
};

export function LegalPage({ title, eyebrow, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-white px-4 pt-32 pb-20 text-[#3b2a20] sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl">
        <header className="border-b border-[#e7ddd3] pb-8">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#8a5a22] uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-normal text-[#2a1d16] sm:text-5xl">
            {title}
          </h1>
        </header>

        <div className="legal-document mt-10 space-y-10 text-base leading-8 text-[#4b372a]">
          {children}
        </div>
      </article>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-normal text-[#2a1d16]">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="ml-5 list-disc space-y-3 marker:text-[#9b6724]">{children}</ul>;
}

export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="font-semibold text-[#7a4b12] underline decoration-[#cda36c] underline-offset-4 transition-colors hover:text-[#4b2f0b]"
    >
      {children}
    </a>
  );
}
