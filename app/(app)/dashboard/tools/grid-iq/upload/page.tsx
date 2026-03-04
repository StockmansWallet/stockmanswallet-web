import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export const metadata = { title: "Upload Grid \u2014 Grid IQ" };

export default function GridIQUploadPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Upload Grid" subtitle="Upload a processor grid or kill sheet PDF." />
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-white/10 py-12 transition-colors hover:border-brand/30 hover:bg-brand/[0.02]">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
              <Upload className="h-5 w-5 text-brand" />
            </div>
            <p className="text-sm font-medium text-text-primary">Drop your PDF here</p>
            <p className="mt-1 text-xs text-text-muted">Processor grids and kill sheets supported</p>
            <Button variant="secondary" size="sm" className="mt-4">Browse File</Button>
          </div>
          <p className="mt-4 text-xs text-text-muted">PDF upload and AI analysis coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
