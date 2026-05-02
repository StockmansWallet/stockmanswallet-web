import { CheckCircle2 } from "lucide-react";

export function StepComplete({ userName }: { userName?: string }) {
  return (
    <div className="space-y-5 text-center">
      <div className="bg-brand/15 mx-auto flex h-14 w-14 items-center justify-center rounded-full">
        <CheckCircle2 className="text-brand h-7 w-7" />
      </div>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          You&apos;re all set{userName ? `, ${userName.split(" ")[0]}` : ""}.
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-white/60">
          Your account is ready. Add your first herd and start tracking your
          livestock portfolio.
        </p>
      </div>
    </div>
  );
}
