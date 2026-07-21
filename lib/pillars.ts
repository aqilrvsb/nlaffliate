/**
 * The 10 Pillars catalogue.
 *
 * Each level is a fixed checklist. The `hint` is what pops from the "?" icon
 * next to an item — it is reference text, never something the marketer edits.
 * The marketer fills the four columns: problem / solution / planning /
 * execution, and may fill as few rows as they like.
 *
 * Item numbers are stable identifiers: entries are stored against
 * (level, no), so never renumber an existing row — append instead.
 */

export type PillarItem = { no: number; name: string; hint: string };
export type PillarLevel = {
  level: number;
  title: string;
  /** Short label for chips and the reporting summary. */
  short: string;
  items: PillarItem[];
};

export const PILLAR_COLUMNS = [
  { key: "problem",   label: "PROBLEM",   owner: "CLIENT",     emoji: "🔴" },
  { key: "solution",  label: "SOLUTION",  owner: "CONSULTANT", emoji: "💡" },
  { key: "planning",  label: "PLANNING",  owner: "CONSULTANT", emoji: "📋" },
  { key: "execution", label: "EXECUTION", owner: "CLIENT",     emoji: "⚡" },
] as const;

export type PillarColumnKey = (typeof PILLAR_COLUMNS)[number]["key"];

export const PILLARS: PillarLevel[] = [
  {
    level: 1,
    title: "Live Strategy",
    short: "Live",
    items: [
      { no: 1,  name: "Visual Hook", hint: "Engagement & viewers tinggi, risiko violation, cooling 5-10 min" },
      { no: 2,  name: "Text Hook", hint: "Hook ayat first 3 saat yang menarik perhatian" },
      { no: 3,  name: "Offer Strategy", hint: "Buy 1 Free 1, bundle, flash deal" },
      { no: 4,  name: "Script (BK, Script & Visual)", hint: "Big Idea Knowledge + script line-by-line + visual cue" },
      { no: 5,  name: "Live Schedule Konsisten", hint: "Jam emas (peak hour) 8pm-12am, jadual mingguan tetap" },
      { no: 6,  name: "Pre-Live Warm Up", hint: "15 minit sebelum: setup, test sound, brief host, check stock" },
      { no: 7,  name: "Host Rotation & Training", hint: "Min 3 host bergilir, weekly training, script review" },
      { no: 8,  name: "Live KPI Tracking", hint: "Track CCV, GMV/jam, conversion, AOV, viewers retention" },
      { no: 9,  name: "Mid-Live Optimization", hint: "Pivot strategy bila CCV drop, tukar hook/offer" },
      { no: 10, name: "Post-Live Analysis", hint: "Review semua KPI, identify drop point, plan improvement" },
      { no: 11, name: "Backup Host SOP", hint: "Minimum 1 backup host ready, briefing standby" },
      { no: 12, name: "Live Equipment SOP", hint: "Camera, lighting, mic, internet backup checklist" },
      { no: 13, name: "Violation Handling Protocol", hint: "SOP bila kena violation: appeal, cooling, alternative account" },
      { no: 14, name: "Co-Host & Engagement Strategy", hint: "Co-host untuk handle comment, drive engagement" },
      { no: 15, name: "Live Replay Strategy", hint: "Upload highlight live ke account utama & affiliate" },
      { no: 16, name: "GMV Max Live Boost", hint: "Run ads time live untuk boost CCV & sales" },
    ],
  },
  {
    level: 2,
    title: "Product Structure",
    short: "Product",
    items: [
      { no: 1,  name: "Ladder Profit", hint: "Struktur produk dari entry → main → premium" },
      { no: 2,  name: "Product Entry", hint: "Murah, relevan, ≤RM5, boleh free" },
      { no: 3,  name: "Loss Leader", hint: "Produk loss untuk traffic & affiliate recruitment" },
      { no: 4,  name: "Gain (Main Profit SKU)", hint: "Produk profit utama, margin tinggi" },
      { no: 5,  name: "SKU Portfolio Mapping", hint: "Hero / Trial / Volume / Profit category breakdown" },
      { no: 6,  name: "Pricing Strategy", hint: "Anchor pricing, decoy, psychological pricing (RM9.90)" },
      { no: 7,  name: "Bundle Strategy", hint: "Combo deal, cross-sell bundle, upsell offer" },
      { no: 8,  name: "Listing Optimization", hint: "Title, attribute, search term, SEO TikTok Shop" },
      { no: 9,  name: "Product Image/Video Assets", hint: "Min 5 image + 1 video per SKU, A+ content" },
      { no: 10, name: "COGS Tracking", hint: "Cost per SKU + margin calculation real-time" },
      { no: 11, name: "Margin Per SKU", hint: "Track gross margin, contribution margin per SKU" },
      { no: 12, name: "Inventory & Restock Alert", hint: "Min stock alert, lead time, safety stock" },
      { no: 13, name: "New Product Pipeline", hint: "Plan produk baru 3 bulan ahead" },
      { no: 14, name: "Best Seller Monitoring", hint: "Track top 10 SKU daily, double down winner" },
      { no: 15, name: "Cross-Sell Mapping", hint: "SKU A → SKU B recommendation logic" },
      { no: 16, name: "Competitor Pricing Watch", hint: "Track 5 competitor weekly, adjust price" },
    ],
  },
  {
    level: 3,
    title: "Ads Optimization",
    short: "Ads",
    items: [
      { no: 1,  name: "Daily Budget Allocation", hint: "Split budget: VSA, PSA, LIVE Ads, GMV Max" },
      { no: 2,  name: "GMV Max Campaign", hint: "Setup, optimization, daily monitoring" },
      { no: 3,  name: "Video Shopping Ads (VSA)", hint: "Setup VSA dari top performing organic content" },
      { no: 4,  name: "LIVE Shopping Ads", hint: "Boost CCV time live, target audience" },
      { no: 5,  name: "Product Shopping Ads (PSA)", hint: "Auto-bid PSA untuk product entry & main SKU" },
      { no: 6,  name: "Audience Targeting Research", hint: "Demographic, interest, behavior mapping" },
      { no: 7,  name: "Lookalike Audience Setup", hint: "Build lookalike dari customer database" },
      { no: 8,  name: "Retargeting Campaign", hint: "Retarget viewers, cart abandoners, past buyers" },
      { no: 9,  name: "ROAS Tracking Daily", hint: "Track ROAS per campaign, optimize daily" },
      { no: 10, name: "Creative Refresh Cadence", hint: "Tukar creative ads setiap 7 hari (fatigue prevention)" },
      { no: 11, name: "A/B Test Framework", hint: "Test hook, audience, creative, offer" },
      { no: 12, name: "Bid Strategy Optimization", hint: "Manual bid, auto bid, cost cap strategy" },
      { no: 13, name: "Negative Audience Setup", hint: "Exclude irrelevant audience, employees, etc" },
      { no: 14, name: "Pixel & Event Tracking", hint: "TikTok Pixel, event API, conversion tracking" },
      { no: 15, name: "Ads Compliance Check", hint: "Review policy, prevent rejection" },
      { no: 16, name: "Scaling Strategy", hint: "Winning ads → scale 20-30% daily" },
    ],
  },
  {
    level: 4,
    title: "Content Video",
    short: "Content",
    items: [
      { no: 1,  name: "[ASAL] Analyze Content GMV Max Unauthorize", hint: "Analyze content unauthorize tapi dapat GMV tinggi" },
      { no: 2,  name: "Authorize Content 9000 Affiliate", hint: "DM, WhatsApp, invite creator untuk authorize content" },
      { no: 3,  name: "Remake Video Lama Engagement Tinggi", hint: "Reupload & push video lama performing" },
      { no: 4,  name: "[ASAL] Sehari 20 Content Baru + Remake", hint: "20 video sehari (baru + remake)" },
      { no: 5,  name: "[ASAL] Direction Content Marketer", hint: "10 direction/minggu untuk team marketer" },
      { no: 6,  name: "[ASAL] Direction Content HQ", hint: "20 direction/hari dari HQ" },
      { no: 7,  name: "[ASAL] Script Template", hint: "Asingkan template untuk remake & baru" },
      { no: 8,  name: "[ASAL] Shoot Process", hint: "Asingkan shoot untuk remake & baru" },
      { no: 9,  name: "[ASAL] Edit Process", hint: "Asingkan edit workflow untuk remake & baru" },
      { no: 10, name: "[ASAL] Review by NL", hint: "Asingkan review untuk remake & baru" },
      { no: 11, name: "[ASAL] Posting di Account", hint: "Asingkan posting untuk remake & baru" },
      { no: 12, name: "Content Calendar Mingguan", hint: "Plan content 7 hari ahead by category" },
      { no: 13, name: "Trending Sound Tracking", hint: "Daily check trending audio, use within 24 jam" },
      { no: 14, name: "Hashtag Strategy", hint: "Mix viral + niche + branded hashtag" },
      { no: 15, name: "Caption & CTA Template", hint: "Library caption + CTA proven convert" },
      { no: 16, name: "Thumbnail/Cover Optimization", hint: "Test thumbnail untuk video high potential" },
      { no: 17, name: "Hook Analysis (3-Second)", hint: "Audit drop-off 3 saat pertama" },
      { no: 18, name: "Engagement Response SOP", hint: "Reply comment dalam 1 jam, pin top comment" },
      { no: 19, name: "UGC Collection", hint: "Collect customer video, repost dengan tag" },
      { no: 20, name: "Content Mix Ratio", hint: "Educational 50% / Entertainment 30% / Promo 20%" },
      { no: 21, name: "Content Performance Audit", hint: "Weekly top/flop analysis, double down winner" },
    ],
  },
  {
    level: 5,
    title: "Affiliate Pillar",
    short: "Affiliate",
    items: [
      { no: 1,  name: "[ASAL] Recruit 500 Affiliate / 7 Hari", hint: "PRODUCT ENTRY: sales ≥1K, video ≥100, live ≥4, follower ≥1K, est. post 70%, AVV 500-1000\nMAIN SKU: sales ≥10K, video 15-30, live ≥4, follower ≥1K, est. post 70%, AVV >1000" },
      { no: 2,  name: "[ASAL] SOP Affiliate", hint: "Sources: Kalodata, Affiliate Center, Telegram, FB" },
      { no: 3,  name: "[ASAL] Video HQ Untuk Recruit Affiliate", hint: "10 sheet reference + 10 PDF script" },
      { no: 4,  name: "[ASAL] Video Affiliate Untuk Recruit Affiliate", hint: "10 sheet reference + 10 PDF script (versi affiliate)" },
      { no: 5,  name: "[ASAL] Kolam FB & Telegram", hint: "Group affiliate aktif di FB & Telegram" },
      { no: 6,  name: "[ASAL] Reward Kempen", hint: "Reward system untuk top performer" },
      { no: 7,  name: "[ASAL] Top 10 Affiliate GMV → Gold Coin", hint: "Top 10 GMV monthly dapat gold coin" },
      { no: 8,  name: "[ASAL] Top 10 Quantity & Engagement", hint: "Top 10 quantity post & engagement" },
      { no: 9,  name: "[ASAL] Top Engagement Video", hint: "Top video engagement untuk recognition" },
      { no: 10, name: "[ASAL] Team HQ Buat Content Sample", hint: "HQ produce content sample untuk affiliate copy" },
      { no: 11, name: "[ASAL] Listing 10+20 Direction Reference", hint: "Tag seller, ≥5 direction per listing" },
      { no: 12, name: "Affiliate Onboarding Video", hint: "Welcome video + step-by-step guide untuk affiliate baru" },
      { no: 13, name: "Sample Sending Tracking", hint: "Track sample sent, video produced, sales generated" },
      { no: 14, name: "Commission Tier Structure", hint: "Bronze/Silver/Gold/Platinum tier dengan benefit lain" },
      { no: 15, name: "Top Affiliate Retention Plan", hint: "1-on-1 support, exclusive offer, early access" },
      { no: 16, name: "Affiliate Group Moderation", hint: "Daily moderation, answer Q, share update" },
      { no: 17, name: "Monthly Affiliate Webinar", hint: "Webinar bulanan: update, training, Q&A" },
      { no: 18, name: "Affiliate Performance Scorecard", hint: "Individual scorecard: GMV, video, engagement" },
      { no: 19, name: "Bad Affiliate Detection", hint: "Flag affiliate violate policy / negative content" },
    ],
  },
  {
    level: 6,
    title: "Community Pillar",
    short: "Community",
    items: [
      { no: 1,  name: "Customer Telegram Group", hint: "Setup, moderate, content harian" },
      { no: 2,  name: "Customer Facebook Group", hint: "Private group untuk loyal customer" },
      { no: 3,  name: "WhatsApp Broadcast List", hint: "Segmented broadcast untuk update & promo" },
      { no: 4,  name: "Community Events", hint: "Giveaway, quiz, contest mingguan" },
      { no: 5,  name: "VIP Member Program", hint: "Exclusive perks untuk top customer" },
      { no: 6,  name: "Brand Ambassador Program", hint: "Ambassador dari komuniti loyal" },
      { no: 7,  name: "UGC Campaign", hint: "Encourage customer share experience" },
      { no: 8,  name: "Community Guidelines", hint: "Rules, do's & don'ts, moderation policy" },
      { no: 9,  name: "Moderator Team", hint: "Min 2 moderator full-time" },
      { no: 10, name: "Engagement Metrics", hint: "Track active member, post, reply, sentiment" },
      { no: 11, name: "Polls & Feedback Survey", hint: "Bulanan survey untuk product feedback" },
      { no: 12, name: "Member Onboarding Flow", hint: "Welcome message, FAQ, intro video" },
      { no: 13, name: "Community Content Calendar", hint: "Plan content komuniti weekly" },
      { no: 14, name: "Crisis Response SOP", hint: "SOP handle complaint, viral negative" },
    ],
  },
  {
    level: 7,
    title: "Retention Pillar",
    short: "Retention",
    items: [
      { no: 1,  name: "Customer Database Setup", hint: "Centralize data: name, phone, purchase history" },
      { no: 2,  name: "Repeat Purchase Tracking", hint: "Track repeat rate, frequency, AOV" },
      { no: 3,  name: "Welcome Message Automation", hint: "Auto-message after first purchase" },
      { no: 4,  name: "Post-Purchase Follow-Up D1", hint: "Day 1: thank you + usage tip" },
      { no: 5,  name: "Post-Purchase Follow-Up D7", hint: "Day 7: review request + cross-sell" },
      { no: 6,  name: "Post-Purchase Follow-Up D30", hint: "Day 30: replenishment reminder" },
      { no: 7,  name: "Win-Back Campaign", hint: "Target lapsed customer (90+ days)" },
      { no: 8,  name: "Loyalty Program (Points/Tier)", hint: "Earn points per purchase, redeem reward" },
      { no: 9,  name: "Referral Program", hint: "Customer refer customer, both dapat reward" },
      { no: 10, name: "Birthday/Anniversary Offer", hint: "Personalized offer pada birthday" },
      { no: 11, name: "Member Exclusive Deals", hint: "Deal hanya untuk existing customer" },
      { no: 12, name: "NPS Survey", hint: "Quarterly NPS, action on detractor" },
      { no: 13, name: "Churn Analysis", hint: "Identify churn pattern, prevention plan" },
      { no: 14, name: "LTV Calculation", hint: "Track customer lifetime value per cohort" },
      { no: 15, name: "Repeat Purchase Funnel", hint: "Map journey 1st → 2nd → 3rd purchase" },
    ],
  },
  {
    level: 8,
    title: "KOL Pillar",
    short: "KOL",
    items: [
      { no: 1,  name: "[ASAL] 100 KOL List", hint: "Database 100 KOL dengan tier & contact" },
      { no: 2,  name: "[ASAL] Study Data Insight Sebelum Ambil", hint: "Audit data KOL: engagement, audience, GMV history" },
      { no: 3,  name: "[ASAL] Sources: Manual, Creative Center, Kalodata", hint: "Multi-source untuk discovery KOL" },
      { no: 4,  name: "KOL Tier System", hint: "Mega (>1M) / Macro (100K-1M) / Micro (10K-100K) / Nano (<10K)" },
      { no: 5,  name: "KOL Outreach Template", hint: "DM, email, WhatsApp template proven" },
      { no: 6,  name: "KOL Contract & Briefing", hint: "Standard contract + creative brief" },
      { no: 7,  name: "KOL Content Guidelines", hint: "Do's & don'ts, message, hashtag, link" },
      { no: 8,  name: "KOL Performance Tracking", hint: "Track GMV, video view, engagement per KOL" },
      { no: 9,  name: "KOL Exclusivity Terms", hint: "Non-compete clause untuk top KOL" },
      { no: 10, name: "KOL Payment Schedule", hint: "Clear payment timeline & method" },
      { no: 11, name: "KOL Renewal Pipeline", hint: "Identify performing KOL untuk renew/upgrade" },
      { no: 12, name: "KOL Conflict Resolution", hint: "SOP handle dispute, late delivery" },
      { no: 13, name: "Mega Live Collaboration", hint: "Plan mega live dengan top KOL bulanan" },
      { no: 14, name: "KOL Sample Tracking", hint: "Track sample sent, content delivered, sales" },
      { no: 15, name: "KOL Database CRM", hint: "Centralized CRM: contact, history, performance" },
    ],
  },
  {
    level: 9,
    title: "Launching / Event",
    short: "Launch",
    items: [
      { no: 1,  name: "Launch Calendar Mingguan", hint: "Plan campaign/launch 3 bulan ahead" },
      { no: 2,  name: "Pre-Launch Teaser (2 Minggu)", hint: "Teaser content 2 minggu sebelum launch" },
      { no: 3,  name: "Launch Day Execution Plan", hint: "Hour-by-hour plan launch day" },
      { no: 4,  name: "Mega Live Event Setup", hint: "Big live event: KOL, host, ads, stock" },
      { no: 5,  name: "Flash Sale Strategy", hint: "Time-limited offer, scarcity, urgency" },
      { no: 6,  name: "Stock Allocation Launch", hint: "Reserve stock cukup untuk demand surge" },
      { no: 7,  name: "Affiliate Pre-Notification", hint: "Notify affiliate 1 minggu sebelum + sample" },
      { no: 8,  name: "KOL Pre-Launch Posting", hint: "KOL post 3-5 hari sebelum launch" },
      { no: 9,  name: "Post-Launch Analysis", hint: "Review GMV, conversion, learning" },
      { no: 10, name: "Campaign Theme Planning", hint: "Theme per bulan: visual, copy, hook" },
      { no: 11, name: "Seasonal Event Plan", hint: "Raya, Merdeka, 9.9, 10.10, 11.11, 12.12" },
      { no: 12, name: "Co-Brand Collaboration", hint: "Partner brand untuk joint campaign" },
      { no: 13, name: "Launch Budget Allocation", hint: "Ads boost, KOL fee, gift, contest budget" },
      { no: 14, name: "Hype Content Sequence", hint: "Build hype: tease → reveal → countdown → launch" },
    ],
  },
  {
    level: 10,
    title: "AI Pillar",
    short: "AI",
    items: [
      { no: 1,  name: "AI Content Script Generation", hint: "Use AI (ChatGPT/Claude) generate script daily" },
      { no: 2,  name: "AI Image/Thumbnail Generation", hint: "Midjourney/Canva AI untuk thumbnail & banner" },
      { no: 3,  name: "AI Caption Automation", hint: "Auto-generate caption dari video" },
      { no: 4,  name: "AI Customer Service Bot", hint: "Chatbot handle FAQ, route complex query" },
      { no: 5,  name: "AI Live Comment Sentiment", hint: "Real-time sentiment analysis live comment" },
      { no: 6,  name: "AI Competitor Monitoring", hint: "Auto-scrape competitor content & pricing" },
      { no: 7,  name: "AI Affiliate Outreach", hint: "AI-generated personalized DM template" },
      { no: 8,  name: "AI Product Description", hint: "Auto-generate listing description optimized" },
      { no: 9,  name: "AI Sales Forecasting", hint: "Predict demand, stock, ads spend" },
      { no: 10, name: "AI Inventory Alert", hint: "Predictive restock alert" },
      { no: 11, name: "AI Dashboard Reporting", hint: "Auto-generate weekly/monthly report" },
      { no: 12, name: "AI Tool Stack Documentation", hint: "ChatGPT, Claude, Midjourney, Canva, Capcut AI" },
      { no: 13, name: "AI Training for Team", hint: "Monthly training new AI tools & workflow" },
      { no: 14, name: "AI Workflow Automation", hint: "Zapier/Make.com untuk repetitive task" },
      { no: 15, name: "AI Compliance Check", hint: "AI scan content untuk policy violation pre-post" },
    ],
  },
];

export function getPillar(level: number): PillarLevel | undefined {
  return PILLARS.find((p) => p.level === level);
}

/** Total checklist items across every level — the denominator for progress. */
export const TOTAL_PILLAR_ITEMS = PILLARS.reduce((n, p) => n + p.items.length, 0);
