"use client";

import { useLayoutEffect } from "react";

/**
 * Strips the app-wide `dark` class from <html> on report routes so the global
 * dark body background does not bleed into the @page margin boxes in the PDF.
 * Runs as early as possible (useLayoutEffect) before Puppeteer captures the PDF.
 *
 * This is a belt-and-braces fix on top of the !important overrides in
 * print-styles.tsx. Either alone should be sufficient; together they guarantee
 * the PDF renders on a white canvas.
 */
export function ForceLightTheme() {
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.remove("dark");
    html.classList.add("light");
    html.style.background = "white";
    html.style.colorScheme = "light";
    if (document.body) {
      document.body.style.background = "white";
    }
  }, []);
  return null;
}
