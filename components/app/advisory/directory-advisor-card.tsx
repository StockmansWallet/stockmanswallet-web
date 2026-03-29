import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin } from "lucide-react";
import { getCategoryConfig, type DirectoryAdvisor } from "@/lib/types/advisory";

export function DirectoryAdvisorCard({ advisor }: { advisor: DirectoryAdvisor }) {
  const categoryConfig = getCategoryConfig(advisor.role);

  return (
    <Link href={`/dashboard/advisory-hub/directory/${advisor.user_id}`}>
      <Card className="group cursor-pointer transition-all hover:bg-surface-low">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2F8CD9]/15">
                {categoryConfig ? (
                  <categoryConfig.icon className={`h-5 w-5 ${categoryConfig.colorClass}`} />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-[#2F8CD9]" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {advisor.display_name}
                </p>
                {advisor.company_name && (
                  <p className="text-xs text-text-secondary">{advisor.company_name}</p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {categoryConfig && (
                    <Badge variant="default">{categoryConfig.label}</Badge>
                  )}
                  {advisor.state && (
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                      <MapPin className="h-3 w-3" />
                      {advisor.state}
                      {advisor.region ? `, ${advisor.region}` : ""}
                    </span>
                  )}
                </div>
                {advisor.bio && (
                  <p className="mt-2 line-clamp-2 text-xs text-text-muted">
                    {advisor.bio}
                  </p>
                )}
              </div>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
