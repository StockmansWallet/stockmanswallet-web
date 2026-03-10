// Grid IQ extraction types - shared between extraction service and UI components

// Response from grid-iq-parser Edge Function
export interface ParserResponse {
  document_type: "grid" | "killsheet" | "unknown";
  confidence: number;
  requires_ai: boolean;
  data?: GridParserData | KillSheetParserData;
  sheet_names?: string[];
  male_sheet?: string | null;
  female_sheet?: string | null;
  column_mapping?: Record<string, string> | null;
  // CSV text fallback when structured parsing yields empty results
  text_content?: string | null;
  message?: string;
  error?: string;
}

// Parsed grid data from the Edge Function
export interface GridParserData {
  processorName: string | null;
  gridCode: string | null;
  gridDate: string | null;
  expiryDate: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  location: string | null;
  notes: string | null;
  entries: GridEntryData[];
}

export interface GridEntryData {
  gradeCode: string;
  category: string;
  gender: string | null;
  fatRange: string | null;
  dentitionRange: string | null;
  shapeRange: string | null;
  weightBandPrices: WeightBandPriceData[];
  sourceSheet?: string;
}

export interface WeightBandPriceData {
  weightBandKg: number;
  weightBandLabel: string;
  pricePerKg: number;
}

// Parsed kill sheet data from the Edge Function
export interface KillSheetParserData {
  processorName: string | null;
  killDate: string | null;
  vendorCode: string | null;
  pic: string | null;
  propertyName: string | null;
  bookingReference: string | null;
  bookingType: string | null;
  totalHeadCount: number;
  totalBodyWeight: number;
  totalGrossValue: number;
  averageBodyWeight?: number;
  averagePricePerKg?: number;
  condemns: number;
  lineItems: KillSheetLineItemData[];
  categorySummaries?: CategorySummaryData[];
  gradeDistribution?: GradeDistributionData[];
}

export interface KillSheetLineItemData {
  body_number?: number;
  hscw_kg?: number;
  left_weight?: number;
  right_weight?: number;
  left_grade?: string;
  right_grade?: string;
  grade?: string;
  p8_fat_mm?: number;
  dentition?: number;
  category?: string;
  price_per_kg?: number;
  gross_value?: number;
  butt_shape?: string;
  marbling?: number;
  meat_colour?: string;
  fat_colour?: number;
  nlis_rfid?: string;
  comments?: string;
}

export interface CategorySummaryData {
  category: string;
  body_count: number;
  percentage: number;
  total_weight: number;
  average_weight: number;
  average_value: number;
  average_price_per_kg: number;
  total_value: number;
  condemns: number;
}

export interface GradeDistributionData {
  grade_code: string;
  category: string;
  body_count: number;
  percentage: number;
  total_weight: number;
  average_weight: number;
}

// Extraction result returned to the UI
export interface ExtractionResult {
  documentType: "grid" | "killsheet";
  confidence: number;
  parsedViaAI: boolean;
  gridData?: GridParserData;
  killSheetData?: KillSheetParserData;
  // Head count reconciliation
  reconciliation?: HeadCountReconciliation;
}

export interface HeadCountReconciliation {
  summaryHeadCount: number;
  extractedLineItemCount: number;
  isMatched: boolean;
  difference: number;
  message: string;
}
