import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UserProfileCardProps {
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
}

const roleLabels: Record<string, string> = {
  producer: "Producer",
  agribusiness_banker: "Agribusiness Banker",
  insurer: "Insurer",
  livestock_agent: "Livestock Agent",
  accountant: "Accountant",
  succession_planner: "Succession Planner",
};

export function UserProfileCard({ firstName, lastName, email, role }: UserProfileCardProps) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "SW";
  const roleLabel = role ? roleLabels[role] || role : null;

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
          <span className="text-sm font-bold">{initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary">
            {firstName} {lastName}
          </p>
          <p className="truncate text-xs text-text-muted">{email}</p>
          {roleLabel && (
            <Badge variant="brand" className="mt-1">
              {roleLabel}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
