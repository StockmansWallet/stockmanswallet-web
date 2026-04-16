/**
 * Scrolls to the first field with a validation error and focuses it.
 * Fields with errors are marked with `data-field-error="true"` on their
 * outermost wrapper (added automatically by Input, Select, Textarea, DatePicker).
 */
export function scrollToFirstError(): void {
  const firstError = document.querySelector<HTMLElement>(
    '[data-field-error="true"]',
  );
  if (!firstError) return;

  firstError.scrollIntoView({ behavior: "smooth", block: "center" });

  // Focus the first focusable element inside the error field after scroll settles
  setTimeout(() => {
    const focusable = firstError.querySelector<HTMLElement>(
      "input, select, textarea, button",
    );
    focusable?.focus();
  }, 350);
}
