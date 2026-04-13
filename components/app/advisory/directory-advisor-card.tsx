import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin } from "lucide-react";
import { getCategoryConfig, type DirectoryAdvisor } from "@/lib/types/advisory";

export function DirectoryAdvisorCard({ advisor }: { advisor: DirectoryAdvisor }) {
  const categoryConfig = getCategoryConfig(advisor.role);
  const categoryBg = categoryConfig?.bgClass ?? "bg-[#2F8CD9]/15";
  const categoryColour = categoryConfig?.colorClass ?? "text-[#2F8CD9]";

  return (
    <Link href={`/dashboard/advisory-hub/directory/${advisor.user_id}`}>
      <Card className="group border border-white/5 transition-all hover:border-white/10 hover:bg-white/[0.02]">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${categoryBg} shadow-sm`}>
                {categoryConfig ? (
                  <categoryConfig.icon className={`h-5 w-5 ${categoryColour}`} />
                ) : (
                  <span className="text-sm font-bold text-[#2F8CD9]">{advisor.display_name?.charAt(0)}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-text-primary">
                    {advisor.display_name}
                  </p>
                  {categoryConfig && (
                    <Badge variant="default" className="shrink-0">{categoryConfig.label}</Badge>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  {advisor.company_name && (
                    <span className="text-xs text-text-muted">{advisor.company_name}</span>
                  )}
                  {advisor.state && (
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                      <MapPin className="h-3 w-3" />
                      {advisor.state}{advisor.region ? `, ${advisor.region}` : ""}
                    </span>
                  )}
                </div>
                {advisor.bio && (
                  <p className="mt-1.5 line-clamp-1 text-xs text-text-muted">{advisor.bio}</p>
                )}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
