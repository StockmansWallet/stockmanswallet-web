"use client";

import type { RegionalDataSnapshot } from "@/lib/types/lens-report";

interface RegionalDataDisplayProps {
  data: RegionalDataSnapshot;
}

export function RegionalDataDisplay({ data }: RegionalDataDisplayProps) {
  const hasSaleyard = data.saleyard_prices.length > 0;
  const hasNational = data.national_prices.length > 0;

  if (!hasSaleyard && !hasNational) {
    return (
      <p className="text-xs text-text-muted italic">
        No regional price data available for this category.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {hasSaleyard && (
        <div>
          <h4 className="text-xs font-semibold text-text-secondary mb-1.5">Saleyard Prices</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted">
                  <th className="text-left font-medium pb-1 pr-3">Saleyard</th>
                  <th className="text-left font-medium pb-1 pr-3">Category</th>
                  <th className="text-right font-medium pb-1 pr-3">$/kg</th>
                  <th className="text-right font-medium pb-1">Weight</th>
                </tr>
              </thead>
              <tbody>
                {data.saleyard_prices.map((p, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="py-1 pr-3 text-text-primary">{p.saleyard}</td>
                    <td className="py-1 pr-3 text-text-secondary">{p.category}</td>
                    <td className="py-1 pr-3 text-right font-medium text-text-primary">
                      ${p.price_per_kg.toFixed(2)}
                    </td>
                    <td className="py-1 text-right text-text-muted">
                      {p.weight_range ?? "All"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasNational && (
        <div>
          <h4 className="text-xs font-semibold text-text-secondary mb-1.5">National Prices</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted">
                  <th className="text-left font-medium pb-1 pr-3">Category</th>
                  <th className="text-right font-medium pb-1 pr-3">$/kg</th>
                  <th className="text-right font-medium pb-1">Weight</th>
                </tr>
              </thead>
              <tbody>
                {data.national_prices.map((p, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="py-1 pr-3 text-text-primary">{p.category}</td>
                    <td className="py-1 pr-3 text-right font-medium text-text-primary">
                      ${p.price_per_kg.toFixed(2)}
                    </td>
                    <td className="py-1 text-right text-text-muted">
                      {p.weight_range ?? "All"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[10px] text-text-muted">
        Fetched {new Date(data.fetched_at).toLocaleDateString("en-AU")}
      </p>
    </div>
  );
}
