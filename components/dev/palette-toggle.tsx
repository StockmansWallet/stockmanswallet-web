"use client";

import { useEffect, useState } from "react";

type Palette = "apple" | "gemini" | "outback";

const STORAGE_KEY = "sw-palette";

const PALETTES: { id: Palette; label: string }[] = [
  { id: "apple", label: "Apple" },
  { id: "outback", label: "Outback" },
  { id: "gemini", label: "Gemini" },
];

export function PaletteToggle() {
  const [palette, setPalette] = useState<Palette>("apple");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = (localStorage.getItem(STORAGE_KEY) as Palette | null) ?? "apple";
    setPalette(stored);
    applyPalette(stored);
  }, []);

  function applyPalette(p: Palette) {
    if (p === "apple") {
      delete document.documentElement.dataset.palette;
    } else {
      document.documentElement.dataset.palette = p;
    }
  }

  function toggle(p: Palette) {
    setPalette(p);
    localStorage.setItem(STORAGE_KEY, p);
    applyPalette(p);
  }

  if (!mounted) return null;
  if (process.env.NODE_ENV === "production") return null;

  return (
    <div
      data-palette-toggle
      className="fixed right-4 bottom-16 z-[9999] flex items-center gap-0.5 rounded-full border border-white/10 bg-black/70 p-1 text-[11px] font-semibold shadow-lg backdrop-blur-md"
    >
      {PALETTES.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => toggle(p.id)}
          className={`rounded-full px-3 py-1 transition-colors ${
            palette === p.id ? "bg-white text-black" : "text-white/60 hover:text-white"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
