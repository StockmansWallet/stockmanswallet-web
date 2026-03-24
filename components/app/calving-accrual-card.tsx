import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface CalvingAccrualCardProps {
  totalAccrual: number;
  breederCount: number;
  pregnantCount: number;
}

export function CalvingAccrualCard({
  totalAccrual,
  breederCount,
  pregnantCount,
}: CalvingAccrualCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Calving Accrual</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5">
        <div className="rounded-xl bg-white/[0.03] p-3 text-center">
          <p className="text-xs text-text-muted">Pre-Birth Accrual</p>
          <p className="mt-1 text-lg font-bold text-text-primary">
            {totalAccrual > 0
              ? `$${Math.round(totalAccrual).toLocaleString()}`
              : "-"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-white/[0.03] p-3">
            <p className="text-xs text-text-muted">Breeders</p>
            <p className="mt-1 text-lg font-bold text-text-primary">
              {breederCount}
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-3">
            <p className="text-xs text-text-muted">Pregnant</p>
            <p className="mt-1 text-lg font-bold text-text-primary">
              {pregnantCount}
            </p>
          </div>
        </div>
        {totalAccrual > 0 && (
          <p className="text-xs text-text-muted">
            Progressive value of unborn calves included in portfolio
          </p>
        )}
      </CardContent>
    </Card>
  );
}
