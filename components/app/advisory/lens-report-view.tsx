"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Loader2, Clock, User } from "lucide-react";
import type { LensReport } from "@/lib/types/lens-report";
import type { AdvisorLensReportData } from "@/lib/types/lens-report";

interface LensReportViewProps {
  report: LensReport;
  clientName: string;
  advisorName: string;
}

export function LensReportView({
  report,
  clientName,
  advisorName,
}: LensReportViewProps) {
  const reportData = report.report_data as AdvisorLensReportData | null;
  const narrative = report.advisor_narrative;
  const [isExporting, startExport] = useTransition();

  if (!narrative) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-text-muted">Report data not available.</p>
        </CardContent>
      </Card>
    );
  }

  // Split narrative into sections by blank-line-separated headings
  const sections = parseNarrativeSections(narrative);

  return (
    <div className="space-y-6">
      {/* Report header */}
      <Card className="border-[#2F8CD9]/20 bg-[#2F8CD9]/5">
        <CardContent className="py-5 px-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-[#2F8CD9]" />
                <h2 className="text-lg font-bold text-text-primary">
                  Valuation Assessment Report
                </h2>
              </div>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {advisorName} for {clientName}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {report.report_generated_at
                    ? new Date(report.report_generated_at).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "N/A"}
                </span>
              </div>
            </div>
            <Badge className="bg-success/15 text-success">
              Report Generated
            </Badge>
          </div>

          {/* Value summary row */}
          <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-[#2F8CD9]/20">
            <div>
              <p className="text-xs text-text-muted">Client Portfolio</p>
              <p className="text-lg font-bold text-text-secondary">
                ${(report.total_baseline_value ?? 0).toLocaleString("en-AU", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Adjusted Portfolio</p>
              <p className="text-lg font-bold text-text-primary">
                ${(report.total_adjusted_value ?? 0).toLocaleString("en-AU", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Shaded Value (Lending)</p>
              <p className="text-lg font-bold text-[#2F8CD9]">
                ${(report.total_shaded_value ?? 0).toLocaleString("en-AU", { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Narrative sections */}
      {sections.map((section, i) => (
        <Card key={i}>
          <CardContent className="py-5 px-6">
            {section.heading && (
              <h3 className="text-sm font-bold text-text-primary mb-3">
                {section.heading}
              </h3>
            )}
            <div className="space-y-3">
              {section.paragraphs.map((para, j) => (
                <p key={j} className="text-sm text-text-secondary leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* PDF download */}
      <div className="flex justify-end">
        <Button
          variant="advisor"
          disabled={isExporting}
          onClick={() => {
            startExport(async () => {
              try {
                if (!reportData) return;
                const { generateAdvisorLensPDF } = await import(
                  "@/lib/services/report-pdf-service"
                );
                const pdfBytes = await generateAdvisorLensPDF(reportData);
                const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${report.name.replace(/\s+/g, "-")}-report.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              } catch {
                // silent failure
              }
            });
          }}
        >
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Download PDF
        </Button>
      </div>
    </div>
  );
}

interface NarrativeSection {
  heading: string | null;
  paragraphs: string[];
}

function parseNarrativeSections(narrative: string): NarrativeSection[] {
  const lines = narrative.split("\n");
  const sections: NarrativeSection[] = [];
  let current: NarrativeSection = { heading: null, paragraphs: [] };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect heading: a short line (under 80 chars) that is followed by content,
    // often all-caps or title-case, and not ending with a period
    const isHeading =
      trimmed.length < 80 &&
      !trimmed.endsWith(".") &&
      !trimmed.endsWith(",") &&
      /^[A-Z]/.test(trimmed);

    // Check if it looks like a section heading (short, no period, starts with uppercase)
    if (isHeading && current.paragraphs.length > 0) {
      sections.push(current);
      current = { heading: trimmed, paragraphs: [] };
    } else if (isHeading && current.paragraphs.length === 0 && current.heading === null) {
      current.heading = trimmed;
    } else {
      current.paragraphs.push(trimmed);
    }
  }

  if (current.heading || current.paragraphs.length > 0) {
    sections.push(current);
  }

  return sections;
}
