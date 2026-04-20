/**
 * Small orange pill shown when signed in as the public demo account.
 * Anchored to the bottom-right corner so it stays visible without
 * covering page titles or navigation.
 */
export function DemoModeBanner() {
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 lg:bottom-6 lg:right-6"
      data-print-hide
      aria-label="Demo mode active. Changes will not save."
    >
      <span className="rounded-full bg-brand px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg">
        Demo Mode
      </span>
    </div>
  );
}
