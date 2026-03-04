import {
  DollarSign,
  BarChart3,
  Truck,
  MessageSquare,
  ClipboardList,
  Check,
  ShieldCheck,
} from "lucide-react";

export function CurrencyDollarIcon() {
  return <DollarSign className="h-6 w-6" />;
}

export function ChartBarIcon() {
  return <BarChart3 className="h-6 w-6" />;
}

export function TruckIcon() {
  return <Truck className="h-6 w-6" />;
}

export function ChatBubbleLeftRightIcon() {
  return <MessageSquare className="h-6 w-6" />;
}

export function ClipboardDocumentListIcon() {
  return <ClipboardList className="h-6 w-6" />;
}

export function CheckIcon() {
  return <Check className="h-5 w-5 shrink-0 text-brand" strokeWidth={2} />;
}

export function ShieldCheckIcon() {
  return <ShieldCheck className="h-6 w-6" />;
}
