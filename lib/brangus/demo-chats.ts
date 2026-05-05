// Hardcoded Brangus conversations shown to the demo user. The live AI endpoint
// is gated out for demo accounts so visitors can browse the kinds of questions
// and answers Brangus produces without costing us anything.

import type { QuickInsight } from "./types";

export type DemoMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type DemoConversation = {
  id: string;
  title: string;
  preview: string;
  // Relative day offset from today for sort ordering and the "X days ago" label.
  daysAgo: number;
  messages: DemoMessage[];
  // Summary cards shown beneath the conversation, mirroring what
  // display_summary_cards would produce on a live chat.
  insights?: QuickInsight[];
};

// The conversation shown on the Chat tab by default.
export const DEMO_ACTIVE_CONVERSATION: DemoConversation = {
  id: "demo-active",
  title: "Should I sell my Droughtmaster steers now or in six weeks?",
  preview: "Walks through CQLX trend, freight, and a target weight window.",
  daysAgo: 0,
  messages: [
    {
      id: "m1",
      role: "user",
      content: "Should I sell my Droughtmaster yearling steers now or hold for another six weeks?",
    },
    {
      id: "m2",
      role: "assistant",
      content:
        "Good question, and the answer depends on a couple of things I can see in your portfolio. Your Droughtmaster Yearlings are sitting at 350 kg off the Bore Paddock, with DWG around 0.9. In six weeks at that gain they'll push roughly 390 kg, which lifts them into a stronger bracket at Gracemere.\n\nCQLX has been firm on yearling steers the last three weeks. Averages at 440 to 490 kg are trading around $4.00 to $4.12 per kg. At your current 350 kg you're closer to $3.70 per kg on recent sales, so holding gets you both more weight and a better unit price.\n\nThe trade-off is feed cost and seasonal risk. If your Bore Paddock is still in good condition through May, holding makes sense. If you're already starting to feed them, the maths tightens up fast.\n\nMy recommendation: hold four to six weeks if pasture holds, and book them onto the first CQLX sale after they clear 380 kg. I can set a Yardbook reminder for the weekly sale in six weeks' time if you like.",
    },
    {
      id: "m3",
      role: "user",
      content: "What about freight to Roma instead?",
    },
    {
      id: "m4",
      role: "assistant",
      content:
        "Worth checking. Roma sits about 380 km south of Doongara Station, versus 95 km to Gracemere. On a B-double load of 60 head that's roughly $1.80 to $2.10 per head per 100 km, so you're looking at around $720 extra in cartage to put them through Roma.\n\nRoma's been running a little hotter for yearling steers this month, call it 10 to 20 cents per kg premium on comparable Droughtmaster lines. On a 380 kg carcass that's $38 to $76 per head of upside, versus an extra $12 per head in freight.\n\nSo the Roma play pays back comfortably if you can secure a spot in their sale, especially for a clean Droughtmaster line with your weights. I'd still book Gracemere as the fallback because the weekly sale gives you timing flexibility. Want me to scope the next three Roma sale dates?",
    },
  ],
  insights: [
    {
      id: "i-active-1",
      label: "Hold window",
      value: "4-6 weeks",
      subtitle: "Target 380 kg then sell",
      sentiment: "positive",
    },
    {
      id: "i-active-2",
      label: "Roma vs Gracemere",
      value: "+$26-64/head",
      subtitle: "Net of extra freight",
      sentiment: "positive",
      action: { type: "market" },
    },
    {
      id: "i-active-3",
      label: "Extra freight",
      value: "$720",
      subtitle: "380 km vs 95 km B-double",
      sentiment: "neutral",
      action: { type: "freight" },
    },
    {
      id: "i-active-4",
      label: "Schedule sale",
      value: "Yardbook",
      subtitle: "Set reminder for 6 weeks",
      sentiment: "neutral",
      action: { type: "yardbook" },
    },
  ],
};

// Pre-seeded saved conversations shown in the Saved Chats tab.
export const DEMO_SAVED_CONVERSATIONS: DemoConversation[] = [
  {
    id: "demo-saved-1",
    title: "What's my portfolio worth today?",
    preview: "Breakdown by class with the big movers called out.",
    daysAgo: 2,
    messages: [
      {
        id: "s1-1",
        role: "user",
        content: "What's my portfolio worth today?",
      },
      {
        id: "s1-2",
        role: "assistant",
        content:
          "Here's where you sit as of today across both properties.\n\nTotal: $1,606,974 across 18 active herds and 954 head.\n\nBy class:\nBreeders carry the most weight at $802,500 across 377 head, mostly the Main Breeders and Hereford Breeders at Doongara.\nSteers come in at $548,200, led by your Feeder Steers (40 head, 380 kg Angus, $166k) and Backgrounder Steers at Brangus Hills.\nHeifers at $168,900, with the Yearling Heifers near-ready for Emerald.\nBulls and culls round out the rest at $87,300.\n\nBiggest value per head: your Wagyu Weaners at $2,240 per head, followed by the Herd Bulls at $2,000 per head. Biggest total exposure: Main Breeders at $340k.\n\nWant me to break down the price source for any of these, or flag any that are running on stale saleyard data?",
      },
    ],
    insights: [
      {
        id: "i-s1-1",
        label: "Portfolio total",
        value: "$1.60M",
        subtitle: "18 herds / 954 head",
        sentiment: "positive",
        action: { type: "portfolio" },
      },
      {
        id: "i-s1-2",
        label: "Top class",
        value: "Breeders",
        subtitle: "$802k across 377 head",
        sentiment: "neutral",
      },
      {
        id: "i-s1-3",
        label: "Best $/head",
        value: "$2,240",
        subtitle: "Wagyu Weaners",
        sentiment: "positive",
      },
      {
        id: "i-s1-4",
        label: "Biggest exposure",
        value: "$340k",
        subtitle: "Main Breeders",
        sentiment: "neutral",
      },
    ],
  },
  {
    id: "demo-saved-2",
    title: "When should I start joining the first-calf heifers?",
    preview: "Advice on synchronisation timing and bull selection.",
    daysAgo: 5,
    messages: [
      {
        id: "s2-1",
        role: "user",
        content: "When should I start joining the first-calf heifers again this year?",
      },
      {
        id: "s2-2",
        role: "assistant",
        content:
          "Your First-Calf Heifers are 26 months old with 34 calves already dropped, which means they're on track for a second joining. To hit a mid-winter calving next year you want them back in calf from roughly the third week of May through late July.\n\nA few things to think about:\n\nBody condition first. Heifers raising their first calf often lose condition in their second joining if they're still on their first. Target a score of 2.5 to 3 before you put bulls in.\n\nSynchronised vs uncontrolled. You ran a controlled joining last year. With the Doongara Dozer AI program running on your Main Breeders, you could piggyback these heifers on the same synch protocol and re-use the same AI sires. That gives you a tight 21-day calving window and better bull utilisation.\n\nCalf weaning. If you wean the current calves at 3 months (late May based on your calf weight recorded date), condition recovers quickly and your re-joining window is exactly right.\n\nRecommendation: wean around 20 May, start CIDR insertions early June, AI last week of June, then drop clean-up bulls in for 30 days. Happy to add milestones to your Yardbook if you'd like.",
      },
    ],
    insights: [
      {
        id: "i-s2-1",
        label: "Wean calves",
        value: "~20 May",
        subtitle: "3 months old, ease condition loss",
        sentiment: "neutral",
        action: { type: "yardbook" },
      },
      {
        id: "i-s2-2",
        label: "Start synch",
        value: "Early Jun",
        subtitle: "CIDR insertions",
        sentiment: "positive",
        action: { type: "yardbook" },
      },
      {
        id: "i-s2-3",
        label: "AI window",
        value: "Last wk Jun",
        subtitle: "Re-use Doongara Dozer sires",
        sentiment: "positive",
      },
      {
        id: "i-s2-4",
        label: "Clean-up bulls",
        value: "30 days",
        subtitle: "Tight 21-day calving target",
        sentiment: "neutral",
      },
    ],
  },
  {
    id: "demo-saved-3",
    title: "Why is my Cull Cows mob showing National Avg pricing?",
    preview: "Explains stale data fallback and what to do about it.",
    daysAgo: 9,
    messages: [
      {
        id: "s3-1",
        role: "user",
        content: "Why is my Cull Cows mob showing National Avg pricing on the dashboard?",
      },
      {
        id: "s3-2",
        role: "assistant",
        content:
          "Because Gracemere hasn't reported a Dry Cow Cows price in the last 42 days, so the valuation engine has fallen back to the National Average for that category. That's why you're seeing the amber National Avg chip on that card.\n\nThere are two ways to fix it up:\n\nOption one: change the herd's preferred saleyard to the nearest yard that does have fresh data for that category. Looking at your portfolio, Roma and Blackall have both reported Dry Cow prices in the last three weeks. Switching would give you a saleyard-sourced valuation again with only a modest freight adjustment.\n\nOption two: wait for the next Gracemere report. Dry Cows go through CQLX roughly every 4 to 6 weeks, so you're probably one or two weekly sales away from fresh data.\n\nIf you want my read, Roma is the cleaner switch right now because that mob is drafted for sale anyway. Let me know and I can set the override.",
      },
    ],
    insights: [
      {
        id: "i-s3-1",
        label: "Stale data",
        value: "42+ days",
        subtitle: "No Gracemere Dry Cow report",
        sentiment: "negative",
      },
      {
        id: "i-s3-2",
        label: "Fresh nearby",
        value: "Roma",
        subtitle: "Reported within 3 weeks",
        sentiment: "positive",
        action: { type: "market" },
      },
      {
        id: "i-s3-3",
        label: "Alternate yard",
        value: "Blackall",
        subtitle: "Also fresh data",
        sentiment: "positive",
      },
      {
        id: "i-s3-4",
        label: "Recommendation",
        value: "Switch to Roma",
        subtitle: "Mob already drafted for sale",
        sentiment: "positive",
      },
    ],
  },
  {
    id: "demo-saved-4",
    title: "Give me a freight estimate: Emerald to Dubbo",
    preview: "B-double cost breakdown plus route considerations.",
    daysAgo: 14,
    messages: [
      {
        id: "s4-1",
        role: "user",
        content: "Give me a freight estimate: 60 head of Angus steers, Emerald to Dubbo.",
      },
      {
        id: "s4-2",
        role: "assistant",
        content:
          "Sixty head of Angus yearling steers around 380 kg each is a clean B-double load, so you're looking at a single trip.\n\nRoute: Emerald to Dubbo is 1,050 km via the Carnarvon and Newell highways, roughly 13 to 14 hours on the road with mandatory rest breaks.\n\nCost breakdown:\nLinehaul: $3.60 per head per 100 km on a B-double = $2,268.\nLoading and yard fees at Emerald: $2.50 per head = $150.\nUnloading at Dubbo: $2.00 per head = $120.\nNLIS transfer levy: covered within the sale processing, no separate charge.\n\nTotal delivered cost: roughly $2,540, or about $42.30 per head.\n\nThings to note: that route crosses the NSW border so you'll need clean NLIS tags and a valid NVD. Dubbo prefers morning arrivals for yard space. If you want, I can also price Dubbo vs Tamworth for the same load to see which gives you better net returns against current pricing.",
      },
    ],
    insights: [
      {
        id: "i-s4-1",
        label: "Total freight",
        value: "$2,540",
        subtitle: "60 head B-double delivered",
        sentiment: "neutral",
        action: { type: "freight" },
      },
      {
        id: "i-s4-2",
        label: "Per head",
        value: "$42.30",
        subtitle: "All-in to Dubbo",
        sentiment: "neutral",
      },
      {
        id: "i-s4-3",
        label: "Route",
        value: "1,050 km",
        subtitle: "~13-14 hrs via Newell Hwy",
        sentiment: "neutral",
      },
      {
        id: "i-s4-4",
        label: "Compare Tamworth",
        value: "Side-by-side",
        subtitle: "Net return check",
        sentiment: "positive",
        action: { type: "market" },
      },
    ],
  },
];

export function allDemoConversations(): DemoConversation[] {
  return [DEMO_ACTIVE_CONVERSATION, ...DEMO_SAVED_CONVERSATIONS];
}
