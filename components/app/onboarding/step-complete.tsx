import { CheckCircle2 } from "lucide-react";

export function StepComplete({ accountType }: { accountType?: string }) {
  const isAdvisor = accountType === "advisor";

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand/15">
        <CheckCircle2 className="h-6 w-6 text-brand" />
      </div>
      <h2 className="text-lg font-bold text-text-primary">You&apos;re all set!</h2>
      <p className="mt-2 text-sm text-text-muted">
        {isAdvisor
          ? "Your advisory practice is ready. Start connecting with producers and managing client portfolios."
          : "Your account is ready. Add your herds to start tracking valuations and market data."}
      </p>

      <div className="mt-5 space-y-2 text-left">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Next steps</p>
        {isAdvisor ? (
          <>
            <NextStep number={1} text="Browse the producer directory to find clients" />
            <NextStep number={2} text="Send connection requests to your producers" />
            <NextStep number={3} text="Use Advisor Lens to analyse client portfolios" />
          </>
        ) : (
          <>
            <NextStep number={1} text="Add your first herd with breed, category, and head count" />
            <NextStep number={2} text="Set up your preferred saleyards for local pricing" />
            <NextStep number={3} text="Explore your dashboard for valuations and insights" />
          </>
        )}
      </div>
    </div>
  );
}

function NextStep({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-bold text-brand">
        {number}
      </div>
      <span className="text-sm text-text-secondary">{text}</span>
    </div>
  );
}
