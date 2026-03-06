import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface GrowthMortalityCardProps {
  avgMortalityRate: number;
  avgDailyWeightGain: number;
  totalHead: number;
}

export function GrowthMortalityCard({
  avgMortalityRate,
  avgDailyWeightGain,
  totalHead,
}: GrowthMortalityCardProps) {
  const estimatedLosses = Math.round(totalHead * avgMortalityRate);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Growth & Mortality</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-white/[0.03] p-3">
            <p className="text-xs text-text-muted">Avg Daily Gain</p>
            <p className="mt-1 text-lg font-bold text-text-primary">
              {avgDailyWeightGain > 0 ? `${avgDailyWeightGain.toFixed(2)} kg` : "-"}
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-3">
            <p className="text-xs text-text-muted">Avg Mortality</p>
            <p className="mt-1 text-lg font-bold text-text-primary">
              {avgMortalityRate > 0 ? `${(avgMortalityRate * 100).toFixed(1)}%` : "-"}
            </p>
          </div>
        </div>
        {estimatedLosses > 0 && (
          <p className="text-xs text-text-muted">
            Est. {estimatedLosses} head lost to mortality across portfolio
          </p>
        )}
      </CardContent>
    </Card>
  );
}
