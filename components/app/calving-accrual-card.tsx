import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Leaf } from "lucide-react";

interface CalvingAccrualCardProps {
  totalAccrual: number;
  calvesAtFootValue: number;
  calvesAtFootHead: number;
  breederCount: number;
  pregnantCount: number;
}

export function CalvingAccrualCard({
  totalAccrual,
  calvesAtFootValue,
  calvesAtFootHead,
  breederCount,
  pregnantCount,
}: CalvingAccrualCardProps) {
  const combinedTotal = totalAccrual + calvesAtFootValue;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
            <Leaf className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <CardTitle>Breeding Accrual</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5">
        <div className="rounded-xl bg-white/[0.03] p-3 text-center">
          <p className="text-xs text-text-muted">Total Breeding Value</p>
          <p className="mt-1 text-lg font-bold text-emerald-400">
            ${Math.round(combinedTotal).toLocaleString()}
          </p>
        </div>
        {totalAccrual > 0 && calvesAtFootValue > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/[0.03] p-3">
              <p className="text-xs text-text-muted">Unborn Progeny</p>
              <p className="mt-1 text-sm font-bold text-text-primary">
                ${Math.round(totalAccrual).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3">
              <p className="text-xs text-text-muted">Calves at Foot</p>
              <p className="mt-1 text-sm font-bold text-text-primary">
                ${Math.round(calvesAtFootValue).toLocaleString()}
              </p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
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
          <div className="rounded-xl bg-white/[0.03] p-3">
            <p className="text-xs text-text-muted">Calves</p>
            <p className="mt-1 text-lg font-bold text-text-primary">
              {calvesAtFootHead > 0 ? calvesAtFootHead : "-"}
            </p>
          </div>
        </div>
        <p className="text-xs text-text-muted">
          {totalAccrual > 0 && calvesAtFootValue > 0
            ? "Combined value of unborn progeny and calves at foot included in portfolio"
            : totalAccrual > 0
              ? "Progressive value of unborn calves included in portfolio"
              : "Value of calves at foot included in portfolio"}
        </p>
      </CardContent>
    </Card>
  );
}
