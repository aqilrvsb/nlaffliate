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
        `SELECT id, report_date, campaign_id, campaign_name, spend, sku_orders,
                cost_per_order, gross_revenue, roi
         FROM product_gmv WHERE marketer_id = ?
         ORDER BY report_date DESC, gross_revenue DESC`
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
        `SELECT id, report_date, cost, sku_orders, cost_per_order, gross_revenue, roi,
                gmv, visitors, product_impressions, product_clicks, img1_path, img2_path
         FROM overall_reports WHERE marketer_id = ?
         ORDER BY report_date DESC`
      )
      .all(user.id) as any[]
  );

  return (
    <MarketerShell user={user} affiliates={affiliates} lives={lives}
      unknowns={unknowns} products={products} overall={overall} posts={posts} />
  );
}
