import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = {
  title: "Advisory Hub",
};

export default function AdvisoryHubPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Advisory Hub"
        subtitle="Connect with your advisory team"
      />
      <Card>
        <EmptyState
          icon={<Users className="h-6 w-6 text-purple-400" />}
          title="Coming Soon"
          description="The Advisory Hub will let you collaborate with your livestock agent, accountant, banker, and other advisors. Stay tuned."
          variant="purple"
        />
      </Card>
    </div>
  );
}
