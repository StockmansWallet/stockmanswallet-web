import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  BookOpen,
  Check,
  IdCard,
  Info,
  Lightbulb,
  Lock,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Truck,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Demo Guide",
};

const CAN_DO = [
  "Add, edit, and delete your own herds (local sandbox)",
  "See live portfolio valuation with real MLA saleyard prices",
  "Explore herd detail, breeding accrual, calves at foot",
  "Chat with Brangus, the livestock AI co-pilot",
  "View Markets, Insights, Reports, Freight IQ, Grid IQ",
  "Try the Yard Book and Producer Network layouts",
] as const;

const READ_ONLY = [
  "Seeded herds and properties can\u2019t be edited or deleted",
  "Sales, muster and health records stay on their originals",
  "Settings and profile changes aren\u2019t saved",
  "Producer Network connections and chats aren\u2019t sent",
  "Grid IQ analyses and report PDFs can be generated but not stored",
] as const;

export default async function DemoGuidePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDemoUser = user?.email?.toLowerCase() === process.env.DEMO_EMAIL?.toLowerCase();
  if (!isDemoUser) redirect("/dashboard");

  return (
    <div className="w-full max-w-[1680px] space-y-4 pb-16">
      <PageHeader
        title="Demo Guide"
        titleClassName="text-4xl font-bold text-brand"
        subtitle="A quick tour of what you can try in demo mode."
      />

      {/* Intro */}
      <Card>
        <div className="flex items-start gap-3 p-5">
          <div className="bg-brand/15 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
            <Sparkles className="text-brand h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-text-primary text-sm font-medium">
              You&apos;re signed in to a shared demo account.
            </p>
            <p className="text-text-secondary mt-1 text-sm leading-relaxed">
              The portfolio (2 properties, 22 herds across breeders, steers, heifers and bulls) is
              pre-populated so you can see the app in full flight. You can add or edit your own
              herds in a local sandbox; anything else is read-only.
            </p>
          </div>
        </div>
      </Card>

      {/* Can / Can't */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="bg-success/15 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
              <Check className="text-success h-3.5 w-3.5" />
            </div>
            <CardTitle className="text-base">What you can do</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-white/[0.04] px-5 pb-5">
            {CAN_DO.map((label) => (
              <Bullet key={label}>{label}</Bullet>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="bg-warning/15 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
              <Lock className="text-warning h-3.5 w-3.5" />
            </div>
            <CardTitle className="text-base">What&apos;s read-only</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-white/[0.04] px-5 pb-5">
            {READ_ONLY.map((label) => (
              <Bullet key={label}>{label}</Bullet>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Things to try */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="bg-brand/15 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
            <Lightbulb className="text-brand h-3.5 w-3.5" />
          </div>
          <CardTitle className="text-base">Things to try</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <TryLink
              href="/dashboard/herds/new"
              icon={<IdCard className="h-4 w-4" />}
              title="Add your own herd"
              body="Drop in a 100-head mob of Angus steers and watch the Total Herd Value update."
            />
            <TryLink
              href="/dashboard/brangus"
              icon={<MessageCircle className="h-4 w-4" />}
              title="Ask Brangus"
              body="Try asking about the best saleyard for your Droughtmasters to see the AI in action."
            />
            <TryLink
              href="/dashboard/market"
              icon={<TrendingUp className="h-4 w-4" />}
              title="Scan Markets"
              body="Compare MLA saleyard prices across the country with live data."
            />
            <TryLink
              href="/dashboard/tools/freight"
              icon={<Truck className="h-4 w-4" />}
              title="Price a cartage"
              body="Estimate what it would cost to send a load from Emerald to Roma."
            />
            <TryLink
              href="/dashboard/tools/yard-book"
              icon={<BookOpen className="h-4 w-4" />}
              title="Open the Yard Book"
              body="See upcoming breeding milestones, paddock rotations, and sales."
            />
            <TryLink
              href="/dashboard/herds"
              icon={<IdCard className="h-4 w-4" />}
              title="Drill into a herd"
              body="Click any herd to see projected weight, breeding accrual and sale price."
            />
          </div>
        </CardContent>
      </Card>

      {/* Data lifecycle */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="bg-surface-raised flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
            <Info className="text-text-secondary h-3.5 w-3.5" />
          </div>
          <CardTitle className="text-base">About your local sandbox</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-white/[0.04] px-5 pb-5">
          <Bullet>
            Herds you add live in your <strong className="text-text-primary">browser only</strong>.
            They don&apos;t touch our servers.
          </Bullet>
          <Bullet>
            They <strong className="text-text-primary">persist across page reloads</strong> while
            you&apos;re signed in.
          </Bullet>
          <Bullet>
            They&apos;re <strong className="text-text-primary">cleared when you sign out</strong> or
            switch browsers.
          </Bullet>
          <Bullet>
            Other demo visitors don&apos;t see your additions. Everyone gets the same pristine
            starting state.
          </Bullet>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="border-brand/25 bg-brand/5 border">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-text-primary text-base font-semibold">Ready for the real thing?</p>
            <p className="text-text-secondary mt-1 text-sm">
              Create your own account to track your actual herds and sync with the iOS app.
            </p>
          </div>
          <Link
            href="/sign-up"
            className="bg-brand hover:bg-brand-dark inline-flex h-9 shrink-0 items-center self-start rounded-full px-4 text-sm font-semibold text-white transition-colors sm:self-auto"
          >
            Sign up
          </Link>
        </div>
      </Card>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-text-secondary flex items-start gap-3 py-3 text-sm leading-relaxed first:pt-0 last:pb-0">
      <span className="bg-brand mt-[7px] h-1 w-1 shrink-0 rounded-full" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

function TryLink({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-surface hover:bg-surface-raised flex flex-col gap-1.5 rounded-xl p-4 transition-colors"
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-brand">{icon}</span>
        <span className="text-text-primary group-hover:text-brand transition-colors">{title}</span>
      </div>
      <p className="text-text-secondary text-xs leading-relaxed">{body}</p>
    </Link>
  );
}
