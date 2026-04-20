/**
 * Small orange pill shown at the top of the app when signed in as the
 * public demo account. Floats over content rather than pushing it down.
 */
export function DemoModeBanner() {
  return (
    <div
      className="pointer-events-none fixed top-2 left-1/2 z-50 -translate-x-1/2"
      data-print-hide
      aria-label="Demo mode active. Changes will not save."
    >
      <span className="rounded-full bg-brand px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
        Demo Mode
      </span>
    </div>
  );
}
