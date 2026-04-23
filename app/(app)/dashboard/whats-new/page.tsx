import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { groupByDate, type WhatsNewEntry } from "@/lib/types/whats-new";

export const revalidate = 0;

export const metadata = {
  title: "What's New",
};

export default async function WhatsNewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: updates } = await supabase
    .from("whats_new")
    .select("*")
    .order("date", { ascending: false })
    .order("sort_order", { ascending: false })
    .limit(100);

  const groups = groupByDate((updates ?? []) as WhatsNewEntry[]);

  return (
    <div>
      <PageHeader
        title="What's New"
        titleClassName="text-4xl font-bold text-brand"
        subtitle="Latest features and improvements across Stockman's Wallet."
      />

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="text-text-muted mx-auto mb-3 h-8 w-8" />
            <p className="text-text-muted text-sm">
              No announcements yet. Check back soon for updates.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.dateKey}>
              <CardContent className="px-5 py-4">
                <p className="text-text-muted mb-3 text-xs font-medium tracking-wide uppercase">
                  {group.dateLabel}
                </p>
                <div className="space-y-4">
                  {group.entries.map((entry) => (
                    <WhatsNewItem key={entry.id} entry={entry} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function WhatsNewItem({ entry }: { entry: WhatsNewEntry }) {
  const bullets = entry.summary
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const platformLabel = entry.platform === "ios" ? "iOS" : "Web";

  return (
    <div>
      <div className="flex items-center gap-2">
        <h3 className="text-text-primary text-sm font-semibold">{entry.title}</h3>
        <Badge variant="default" className="text-[10px]">
          {platformLabel}
        </Badge>
      </div>
      <ul className="mt-1.5 space-y-0.5">
        {bullets.map((b, i) => (
          <li key={i} className="text-text-muted flex items-start gap-2 text-xs">
            <span className="bg-brand mt-1.5 h-1 w-1 flex-shrink-0 rounded-full" />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
