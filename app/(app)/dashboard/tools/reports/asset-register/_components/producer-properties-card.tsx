import { Card, CardContent } from "@/components/ui/card";
import type { UserReportDetails, ReportPropertyDetails } from "@/lib/types/reports";

export function ProducerPropertiesCard({
  userDetails,
  properties,
}: {
  userDetails: UserReportDetails;
  properties: ReportPropertyDetails[];
}) {
  return (
    <Card>
      <CardContent className="px-5 py-4">
        <div className="mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Producer</p>
          <p className="mt-0.5 text-base font-semibold text-text-primary">{userDetails.preparedFor}</p>
        </div>
        {properties.length > 0 && (
          <div className="border-t border-white/[0.06] pt-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              {properties.length > 1 ? "Properties" : "Property"}
            </p>
            <div className="flex flex-col gap-1">
              {properties.map((p) => (
                <div key={p.name} className="text-sm">
                  <span className="font-medium text-text-primary">{p.name}</span>
                  {p.picCode && <span className="ml-2 text-xs text-text-muted">PIC: {p.picCode}</span>}
                  {p.state && <span className="ml-2 text-xs text-text-muted">{p.state}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
