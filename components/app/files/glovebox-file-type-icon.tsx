import { Database, File, FileSpreadsheet, FileText, ImageIcon } from "lucide-react";
import type { GloveboxDetectedFileType } from "@/lib/glovebox/files";

export function FileTypeIcon({ type }: { type: GloveboxDetectedFileType }) {
  const className = "h-4 w-4";
  switch (type) {
    case "image":
      return <ImageIcon className={className} />;
    case "spreadsheet":
      return <FileSpreadsheet className={className} />;
    case "data":
      return <Database className={className} />;
    case "pdf":
    case "document":
      return <FileText className={className} />;
    default:
      return <File className={className} />;
  }
}
