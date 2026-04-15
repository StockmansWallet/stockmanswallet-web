import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  TrendingUp,
  Truck,
  Grid3x3,
  Brain,
  FileText,
  Users,
  Mail,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Database,
  Shield,
  ScrollText,
  Bug,
} from "lucide-react";
import { IconCattleTags } from "@/components/icons/icon-cattle-tags";

export const metadata = {
  title: "Help Center",
};

const gettingStarted = [
  {
    title: "Adding Your First Herd",
    description: "Learn how to create herd groups, set breed, category, head count, and weights.",
    href: "/dashboard/herds/new",
  },
  {
    title: "Setting Up Properties",
    description: "Add your properties with location, acreage, and state to organise your herds.",
    href: "/dashboard/properties/new",
  },
  {
    title: "Understanding Your Dashboard",
    description: "Your dashboard shows total herd value, 12-month outlook, herd composition, and key stats at a glance.",
    href: "/dashboard",
  },
  {
    title: "Configuring Sale Locations",
    description: "Set your preferred saleyards so valuations use local market prices instead of national averages.",
    href: "/dashboard/settings/sale-locations",
  },
];

const featureGuides = [
  {
    title: "Herd Management",
    description: "Track head count, weights, daily weight gain, breeding programs, and mortality across all your herds.",
    icon: <IconCattleTags className="h-5 w-5" />,
  },
  {
    title: "Market Prices",
    description: "View live saleyard prices, national averages, and category breakdowns updated from MLA data.",
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    title: "Stockman IQ",
    description: "AI-powered insights about your operation including market trends, portfolio advice, freight rates, and conditions.",
    icon: <Brain className="h-5 w-5" />,
  },
  {
    title: "Yard Book",
    description: "Schedule and track tasks like musters, vet visits, weaning, and sales with date-based reminders.",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    title: "Reports",
    description: "Generate asset registers, sales summaries, saleyard comparisons, and accountant-ready reports.",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    title: "Freight IQ",
    description: "Estimate freight costs between locations with rate calculations for different load types.",
    icon: <Truck className="h-5 w-5" />,
  },
  {
    title: "Grid IQ",
    description: "Upload processor grids to analyse kill sheet data and compare against market benchmarks.",
    icon: <Grid3x3 className="h-5 w-5" />,
  },
  {
    title: "Advisory Hub",
    description: "Connect with livestock agents, advisors, and service providers in your area.",
    icon: <Users className="h-5 w-5" />,
  },
];

const faqs = [
  {
    question: "How is my herd valued?",
    answer: "Herd valuations use the latest MLA saleyard prices for your selected sale location, matched by category and weight range. If your breed has a premium or discount, that's applied automatically. If no saleyard-specific data is available, national averages are used as a fallback.",
  },
  {
    question: "What does 'herds using national avg' mean?",
    answer: "This means some of your herds don't have price data from your selected saleyard, so the valuation falls back to the national average price. You can improve accuracy by setting a saleyard in each herd's settings.",
  },
  {
    question: "How does daily weight gain (DWG) work?",
    answer: "DWG tracks how much weight your cattle gain per day in kg. It's used to project future weights and values in your 12-month outlook. You can update DWG at any time, and the previous rate is preserved for reference.",
  },
  {
    question: "Can I track breeding herds?",
    answer: "Yes. Mark a herd as a breeder herd to track joining dates, calving rates, pregnancy status, and breeding program type (natural or AI). This data feeds into your portfolio projections.",
  },
  {
    question: "How do I remove demo data?",
    answer: "Go to Settings and look for the demo data section. You can remove all demo herds and properties with one click. Your real data will not be affected.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes. All data is stored securely with Supabase using row-level security policies, meaning only you can access your own data. Connections are encrypted with TLS.",
  },
  {
    question: "What's the difference between the iOS app and web app?",
    answer: "Both platforms share the same database and valuation engine. The web app is optimised for desktop use with a wider layout, while the iOS app is designed for use in the paddock with offline support.",
  },
];

export default function HelpCenterPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Help Center"
        titleClassName="text-4xl font-bold text-brand"
        subtitle="Guides, FAQs, and support for Stockman's Wallet."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left Column: Getting Started + Feature Guides + FAQs */}
        <div className="space-y-4 lg:col-span-2">
          {/* Getting Started */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Getting Started</CardTitle>
                <Link
                  href="/dashboard/help/getting-started"
                  className="text-xs font-medium text-brand hover:underline"
                >
                  View full guide
                </Link>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <ul className="divide-y divide-white/5">
                {gettingStarted.map((item) => (
                  <li key={item.title}>
                    <Link
                      href={item.href}
                      className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.03]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary">{item.title}</p>
                        <p className="text-xs text-text-muted">{item.description}</p>
                      </div>
                      <ChevronRight className="ml-3 h-4 w-4 flex-shrink-0 text-text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Feature Guides */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Guides</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <ul className="divide-y divide-white/5">
                {featureGuides.map((item) => (
                  <li
                    key={item.title}
                    className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-3"
                  >
                    <div className="mt-0.5 flex-shrink-0 text-text-muted">{item.icon}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">{item.title}</p>
                      <p className="text-xs text-text-muted">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* FAQs */}
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-white/5 px-5 pb-5">
              {faqs.map((item) => (
                <div key={item.question} className="-mx-2 rounded-lg px-2 py-3">
                  <p className="text-sm font-medium text-text-primary">{item.question}</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">{item.answer}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Support + Resources + Legal */}
        <div className="space-y-4">
          {/* Support */}
          <Card>
            <CardHeader>
              <CardTitle>Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-5 pb-5">
              <a
                href="mailto:support@stockmanswallet.com.au?subject=Bug Report"
                className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.06]"
              >
                <Bug className="h-5 w-5 text-text-muted" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Report an Issue</p>
                  <p className="text-xs text-text-muted">Let us know about bugs or problems</p>
                </div>
              </a>
              <a
                href="mailto:support@stockmanswallet.com.au"
                className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.06]"
              >
                <Mail className="h-5 w-5 text-brand" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Contact Us</p>
                  <p className="text-xs text-text-muted">support@stockmanswallet.com.au</p>
                </div>
              </a>
              <Link
                href="/dashboard/brangus"
                className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.06]"
              >
                <MessageCircle className="h-5 w-5 text-brand" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Ask Brangus</p>
                  <p className="text-xs text-text-muted">AI-powered help for quick questions</p>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Resources */}
          <Card>
            <CardHeader>
              <CardTitle>Resources</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-white/5 px-5 pb-5">
              <Link
                href="/dashboard/whats-new"
                className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.03]"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-brand" />
                  <p className="text-sm font-medium text-text-primary">What&apos;s New</p>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </Link>
              <Link
                href="/dashboard/help/data-sources"
                className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.03]"
              >
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-text-muted" />
                  <p className="text-sm font-medium text-text-primary">Data Sources</p>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </Link>
            </CardContent>
          </Card>

          {/* Legal */}
          <Card>
            <CardHeader>
              <CardTitle>Legal</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-white/5 px-5 pb-5">
              <a
                href="https://stockmanswallet.com.au/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.03]"
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-text-muted" />
                  <p className="text-sm font-medium text-text-primary">Privacy Policy</p>
                </div>
                <ExternalLink className="h-4 w-4 text-text-muted" />
              </a>
              <a
                href="https://stockmanswallet.com.au/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.03]"
              >
                <div className="flex items-center gap-3">
                  <ScrollText className="h-5 w-5 text-text-muted" />
                  <p className="text-sm font-medium text-text-primary">Terms of Service</p>
                </div>
                <ExternalLink className="h-4 w-4 text-text-muted" />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
