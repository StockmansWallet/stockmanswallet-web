"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface PrintMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface BrangusChatPrintViewProps {
  messages: PrintMessage[];
  userLabel?: string;
  date?: Date;
}

export function BrangusChatPrintView({
  messages,
  userLabel = "You",
  date,
}: BrangusChatPrintViewProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || typeof document === "undefined" || messages.length === 0) {
    return null;
  }

  const renderedDate = (date ?? new Date()).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return createPortal(
    <div data-brangus-print>
      <header className="brangus-print__header">
        <div className="brangus-print__logo">B</div>
        <div>
          <h1 className="brangus-print__title">Brangus</h1>
          <p className="brangus-print__date">{renderedDate}</p>
        </div>
      </header>
      <section className="brangus-print__messages">
        {messages.map((m) => (
          <article
            key={m.id}
            className={`brangus-print__msg brangus-print__msg--${m.role}`}
          >
            <div className="brangus-print__role">
              {m.role === "user" ? userLabel : "Brangus"}
            </div>
            <div className="brangus-print__body">{renderBody(m.content)}</div>
          </article>
        ))}
      </section>
    </div>,
    document.body,
  );
}

function renderBody(text: string): ReactNode {
  const paragraphs = text.split("\n\n").filter((p) => p.trim());
  return paragraphs.map((paragraph, i) => {
    const lines = paragraph.split("\n");
    return (
      <div key={i} className="brangus-print__para">
        {lines.map((line, j) => {
          const trimmed = line.trim().replace(/\*\*(.*?)\*\*/g, "$1");
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            return (
              <div key={j} className="brangus-print__bullet">
                <span aria-hidden>•</span>
                <span>{trimmed.slice(2)}</span>
              </div>
            );
          }
          return <p key={j}>{trimmed}</p>;
        })}
      </div>
    );
  });
}
