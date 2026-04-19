import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin } from "lucide-react";
import { getCategoryConfig, type DirectoryAdvisor } from "@/lib/types/advisory";

export function DirectoryAdvisorCard({ advisor }: { advisor: DirectoryAdvisor }) {
  const categoryConfig = getCategoryConfig(advisor.role);
  const categoryBg = categoryConfig?.bgClass ?? "bg-advisor/15";
  const categoryColour = categoryConfig?.colorClass ?? "text-advisor";

  return (
    <Link
      href={`/dashboard/advisory-hub/directory/${advisor.user_id}`}
      className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-white/[0.03]"
    >
      {/* Category avatar */}
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${categoryBg}`}>
        {categoryConfig ? (
          <categoryConfig.icon className={`h-5 w-5 ${categoryColour}`} />
        ) : (
          <span className="text-sm font-bold text-advisor">{advisor.display_name?.charAt(0)}</span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-text-primary">
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
          <p className="mt-1 line-clamp-1 text-xs text-text-muted">{advisor.bio}</p>
        )}
      </div>

      {/* Arrow */}
      <ArrowRight className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
