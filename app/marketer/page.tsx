import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import db from "@/lib/db";
import MarketerShell from "./MarketerShell";

export const dynamic = "force-dynamic";

export default async function MarketerPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "marketer") redirect("/");

  const plain = <T,>(rows: T[]): T[] => rows.map((r) => ({ ...r }));

  // Affiliates assigned to this marketer.
  const affiliateRows = plain(
    await db.prepare(
        `SELECT u.id, u.name, u.email, u.phone, u.address
         FROM users u
         WHERE u.role = 'affiliate' AND u.marketer_id = ?
         ORDER BY u.name`
      )
      .all(user.id) as any[]
  );

  // Their TikTok profile links, grouped per affiliate.
  const profileRows = plain(
    await db.prepare(
        `SELECT p.id, p.user_id, p.label, p.url
         FROM tiktok_profiles p
         JOIN users u ON u.id = p.user_id
         WHERE u.marketer_id = ?
         ORDER BY p.id`
      )
      .all(user.id) as any[]
  );

  const affiliates = affiliateRows.map((a: any) => ({
    ...a,
    links: profileRows.filter((p: any) => p.user_id === a.id),
  }));

  // Every live for those affiliates (client filters by date).
  const lives = plain(
    await db.prepare(
        `SELECT b.id AS booking_id, b.user_id AS affiliate_id,
                u.name AS affiliate, u.email AS affiliate_email,
                p.label AS profile_label, p.url AS profile_url,
                b.live_date, b.start_time, b.end_time, b.note, b.status, b.post_url,
                b.ads_budget, b.affiliate_can_edit,
                b.ad_spend, b.gross_revenue, b.roi,
                r.live_title, r.gmv, r.viewers, r.items_sold, r.duration_live, r.screenshot_path
         FROM bookings b
         JOIN users u ON u.id = b.user_id
         JOIN tiktok_profiles p ON p.id = b.profile_id
         LEFT JOIN live_results r ON r.booking_id = b.id
         WHERE u.marketer_id = ?
         ORDER BY b.live_date DESC, b.start_time DESC`
      )
      .all(user.id) as any[]
  );

  // Unmatched bulk-analytics rows for this marketer.
  const unknowns = plain(
    await db.prepare(
        `SELECT id, live_name, live_date, live_time, duration, ad_spend, gross_revenue, roi
         FROM unknown_lives WHERE marketer_id = ?
         ORDER BY id DESC`
      )
      .all(user.id) as any[]
  );

  // Imported Product GMV (TikTok Ads xlsx) rows.
  const products = plain(
    await db.prepare(
        `SELECT p.id, p.report_date, p.brand_id, b.name AS brand_name,
                p.campaign_id, p.campaign_name, p.spend, p.sku_orders,
                p.cost_per_order, p.gross_revenue, p.roi
           FROM product_gmv p
           LEFT JOIN brands b ON b.id = p.brand_id
          WHERE p.marketer_id = ?
          ORDER BY p.report_date DESC, p.gross_revenue DESC`
      )
      .all(user.id) as any[]
  );

  // Posting — PeningLab video posts for this marketer's affiliates.
  const posts = plain(
    await db.prepare(
        `SELECT p.id, p.user_id AS affiliate_id, p.post_date, p.status
         FROM posts p JOIN users u ON u.id = p.user_id
         WHERE u.marketer_id = ?`
      )
      .all(user.id) as any[]
  );

  // Overall GMV-Max reports (2-screenshot import).
  const overall = plain(
    await db.prepare(
        `SELECT o.id, o.report_date, o.brand_id, b.name AS brand_name,
                o.cost, o.sku_orders, o.cost_per_order, o.gross_revenue, o.roi,
                o.gmv, o.visitors, o.product_impressions, o.product_clicks,
                o.img1_path, o.img2_path
           FROM overall_reports o
           LEFT JOIN brands b ON b.id = o.brand_id
          WHERE o.marketer_id = ?
          ORDER BY o.report_date DESC`
      )
      .all(user.id) as any[]
  );

  return (
    <MarketerShell user={user} affiliates={affiliates} lives={lives}
      unknowns={unknowns} products={products} overall={overall} posts={posts} />
  );
}
