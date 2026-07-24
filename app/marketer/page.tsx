import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import db from "@/lib/db";
import MarketerShell from "./MarketerShell";

export const dynamic = "force-dynamic";

// A page render is a handful of small queries. If it has not finished well
// inside this, something is wedged — fail fast rather than holding the
// invocation open for the platform's five-minute maximum.
export const maxDuration = 20;


export default async function MarketerPage({ searchParams }: { searchParams: { m?: string } }) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "marketer" && user.role !== "leader") redirect("/");
  const isLeader = user.role === "leader";
  // A leader sees every marketer aggregated (mid = null) unless they pick one
  // from the switcher (?m=<id>); a marketer only ever sees their own.
  const selMid = isLeader && searchParams?.m && /^\d+$/.test(searchParams.m) ? Number(searchParams.m) : null;
  const mid: number | null = isLeader ? selMid : user.id;
  // Marketer filter as literal SQL (mid is a validated integer or null) so a
  // chosen marketer hits the index instead of an OR-with-param seq scan.
  const mCond = (col: string) => (mid == null ? "TRUE" : `${col} = ${mid}`);

  // Marketer list powers the leader's switcher.
  const marketers = isLeader
    ? (await db.prepare("SELECT id, name, staff_id FROM users WHERE role = 'marketer' ORDER BY name").all()) as any[]
    : [];

  const plain = <T,>(rows: T[]): T[] => rows.map((r) => ({ ...r }));

  // All six reads are independent, so issue them together rather than paying
  // six sequential round trips to Postgres before the page can render.
  const [affiliateRows, profileRows, lives, unknowns, salesLive, salesProduct, posts, overall, creatorReports, liveUsers, liveSessions, dataQuality, salesCard, spendTtm, reportingSheet, salesLiveCampaign, salesProductCampaign] =
    await Promise.all([
      db.prepare(
          `SELECT u.id, u.name, u.email, u.staff_id, u.phone, u.address, u.activated
             FROM users u
            WHERE u.role = 'affiliate' AND ${mCond("u.marketer_id")}
            ORDER BY u.name`
        ).all() as Promise<any[]>,

      db.prepare(
          `SELECT p.id, p.user_id, p.label, p.url,
                  p.commission_type, p.commission_value, p.brand_id,
                  pb.name AS brand_name,
                  COALESCE(
                    (SELECT array_agg(x.brand_id ORDER BY xb.name)
                       FROM tiktok_profile_brands x
                       JOIN brands xb ON xb.id = x.brand_id
                      WHERE x.profile_id = p.id),
                    '{}'
                  ) AS brand_ids,
                  COALESCE(
                    (SELECT array_agg(xb.name ORDER BY xb.name)
                       FROM tiktok_profile_brands x
                       JOIN brands xb ON xb.id = x.brand_id
                      WHERE x.profile_id = p.id),
                    '{}'
                  ) AS brand_names,
                  COALESCE(
                    (SELECT json_agg(json_build_object(
                              'id', xb.id, 'name', xb.name,
                              'commission_type', x.commission_type,
                              'commission_value', x.commission_value,
                              'lives', (SELECT COUNT(*)::int FROM bookings bk
                                         WHERE bk.profile_id = p.id
                                           AND bk.brand_id = xb.id)
                            ) ORDER BY xb.name)
                       FROM tiktok_profile_brands x
                       JOIN brands xb ON xb.id = x.brand_id
                      WHERE x.profile_id = p.id),
                    '[]'::json
                  ) AS brands
             FROM tiktok_profiles p
             LEFT JOIN brands pb ON pb.id = p.brand_id
             JOIN users u ON u.id = p.user_id
            WHERE ${mCond("u.marketer_id")}
            ORDER BY p.id`
        ).all() as Promise<any[]>,

      db.prepare(
          `SELECT b.id AS booking_id, b.user_id AS affiliate_id,
                  u.name AS affiliate,
                  b.profile_id, p.label AS profile_label, p.url AS profile_url,
                  pb.name AS profile_brand,
                  COALESCE(
                    (SELECT json_agg(json_build_object('id', lb.id, 'name', lb.name)
                              ORDER BY lb.name)
                       FROM tiktok_profile_brands x
                       JOIN brands lb ON lb.id = x.brand_id
                      WHERE x.profile_id = b.profile_id),
                    '[]'::json
                  ) AS link_brands,
                  b.live_date, b.start_time, b.end_time, b.note, b.status, b.post_url,
                  b.ads_budget, b.affiliate_can_edit,
                  b.ad_spend, b.gross_revenue, b.roi,
                  b.brand_id, br.name AS brand_name, b.source,
                  r.live_title, r.gmv, r.viewers, r.items_sold, r.duration_live, r.screenshot_path
             FROM bookings b
             JOIN users u ON u.id = b.user_id
             JOIN tiktok_profiles p ON p.id = b.profile_id
             LEFT JOIN brands pb ON pb.id = p.brand_id
             LEFT JOIN brands br ON br.id = b.brand_id
             LEFT JOIN live_results r ON r.booking_id = b.id
            WHERE ${mCond("u.marketer_id")}
            ORDER BY b.live_date DESC, b.start_time DESC`
        ).all() as Promise<any[]>,

      db.prepare(
          `SELECT id, live_name, live_date, live_time, duration, ad_spend, gross_revenue, roi
             FROM unknown_lives WHERE ${mCond("marketer_id")}
            ORDER BY id DESC`
        ).all() as Promise<any[]>,

      db.prepare(
          `SELECT s.id, to_char(s.report_date, 'YYYY-MM-DD') AS report_date,
                  s.brand_id, b.name AS brand_name,
                  s.cost, s.net_cost, s.gross_revenue, s.roi, s.sku_orders,
                  s.cost_per_order, s.live_views, s.current_budget
             FROM sales_live s
             LEFT JOIN brands b ON b.id = s.brand_id
            WHERE ${mCond("s.marketer_id")}
            ORDER BY s.report_date DESC, s.gross_revenue DESC NULLS LAST`
        ).all() as Promise<any[]>,

      db.prepare(
          `SELECT s.id, to_char(s.report_date, 'YYYY-MM-DD') AS report_date,
                  s.brand_id, b.name AS brand_name,
                  s.cost, s.net_cost, s.current_budget, s.sku_orders, s.cost_per_order,
                  s.gross_revenue, s.roi
             FROM sales_product s
             LEFT JOIN brands b ON b.id = s.brand_id
            WHERE ${mCond("s.marketer_id")}
            ORDER BY s.report_date DESC, s.gross_revenue DESC NULLS LAST`
        ).all() as Promise<any[]>,

      db.prepare(
          `SELECT p.id, p.user_id AS affiliate_id, p.post_date, p.status
             FROM posts p JOIN users u ON u.id = p.user_id
            WHERE ${mCond("u.marketer_id")}`
        ).all() as Promise<any[]>,

      db.prepare(
          `SELECT o.id, o.report_date, o.brand_id, b.name AS brand_name,
                  o.cost, o.sku_orders, o.cost_per_order, o.gross_revenue, o.roi,
                  o.gmv, o.visitors, o.product_impressions, o.product_clicks,
                  o.img1_path, o.img2_path,
                  o.gmv_live, o.gmv_live_creator, o.gmv_live_seller,
                  o.gmv_video, o.gmv_video_creator, o.gmv_video_seller, o.gmv_product_cards
             FROM overall_reports o
             LEFT JOIN brands b ON b.id = o.brand_id
            WHERE ${mCond("o.marketer_id")}
            ORDER BY o.report_date DESC`
        ).all() as Promise<any[]>,

      db.prepare(
          `SELECT c.id, to_char(c.report_date, 'YYYY-MM-DD') AS report_date,
                  c.brand_id, b.name AS brand_name,
                  c.post_gross_revenue, c.post_with_links, c.post_authorized, c.post_creators_mass_auth,
                  c.creative_gross_revenue, c.creative_authorized, c.creative_total_creators,
                  c.creative_creators_mass_auth, c.img1_path, c.img2_path
             FROM creator_reports c
             LEFT JOIN brands b ON b.id = c.brand_id
            WHERE ${mCond("c.marketer_id")}
            ORDER BY c.report_date DESC`
        ).all() as Promise<any[]>,

      db.prepare(
          `SELECT id, name, user_type, phone, tiktok_link
             FROM live_users WHERE ${mCond("marketer_id")} ORDER BY name`
        ).all() as Promise<any[]>,

      db.prepare(
          `SELECT s.id, s.live_user_id, s.brand_id, s.live_date, s.start_time, s.end_time,
                  s.status, s.note, s.ads_budget, s.ad_spend, s.gross_revenue, s.roi, s.gmv, s.viewers,
                  s.items_sold, s.duration_live, s.attachment_path,
                  lu.name AS live_user_name, lu.user_type,
                  b.name AS brand_name
             FROM live_sessions s
             JOIN live_users lu ON lu.id = s.live_user_id
             LEFT JOIN brands b ON b.id = s.brand_id
            WHERE ${mCond("s.marketer_id")}
            ORDER BY s.live_date DESC, s.start_time DESC`
        ).all() as Promise<any[]>,

      db.prepare(
          `SELECT q.id, to_char(q.report_date, 'YYYY-MM-DD') AS report_date,
                  q.brand_id, b.name AS brand_name, q.product_id, q.product_name,
                  q.inque, q.learning, q.delivering,
                  q.exploring, q.explored, q.outstanding, q.performing
             FROM data_quality q
             LEFT JOIN brands b ON b.id = q.brand_id
            WHERE ${mCond("q.marketer_id")}
            ORDER BY q.report_date DESC, q.id DESC`
        ).all() as Promise<any[]>,

      db.prepare(
          `SELECT c.id, to_char(c.report_date, 'YYYY-MM-DD') AS report_date,
                  c.brand_id, b.name AS brand_name,
                  c.cost, c.sku_orders, c.cost_per_order, c.gross_revenue, c.roi
             FROM sales_card c
             LEFT JOIN brands b ON b.id = c.brand_id
            WHERE ${mCond("c.marketer_id")}
            ORDER BY c.report_date DESC, c.id DESC`
        ).all() as Promise<any[]>,

      db.prepare(
          `SELECT t.id, to_char(t.report_date, 'YYYY-MM-DD') AS report_date,
                  t.brand_id, b.name AS brand_name, t.ttm_cost, t.ttm_gross_revenue
             FROM spend_ttm t
             LEFT JOIN brands b ON b.id = t.brand_id
            WHERE ${mCond("t.marketer_id")}
            ORDER BY t.report_date DESC, t.id DESC`
        ).all() as Promise<any[]>,

      db.prepare(
          `SELECT r.id, to_char(r.report_date, 'YYYY-MM-DD') AS report_date,
                  r.brand_id, b.name AS brand_name, r.ord, r.sesi, r.masa,
                  r.c_viewers, r.r_target, r.g_revenue, r.cost, r.v_boost, r.cv_boost, r.d_time
             FROM reporting_sheet r
             LEFT JOIN brands b ON b.id = r.brand_id
            WHERE ${mCond("r.marketer_id")}
            ORDER BY r.report_date DESC, r.ord`
        ).all() as Promise<any[]>,

      db.prepare(
          `SELECT c.id, to_char(c.report_date, 'YYYY-MM-DD') AS report_date,
                  c.brand_id, b.name AS brand_name, c.campaign_id, c.campaign_name,
                  c.cost, c.net_cost, c.gross_revenue, c.roi, c.sku_orders,
                  c.cost_per_order, c.live_views, c.current_budget
             FROM sales_live_campaign c
             LEFT JOIN brands b ON b.id = c.brand_id
            WHERE ${mCond("c.marketer_id")}
            ORDER BY c.report_date DESC, c.gross_revenue DESC NULLS LAST`
        ).all() as Promise<any[]>,

      db.prepare(
          `SELECT c.id, to_char(c.report_date, 'YYYY-MM-DD') AS report_date,
                  c.brand_id, b.name AS brand_name, c.campaign_id, c.campaign_name,
                  c.cost, c.net_cost, c.current_budget, c.sku_orders,
                  c.cost_per_order, c.gross_revenue, c.roi
             FROM sales_product_campaign c
             LEFT JOIN brands b ON b.id = c.brand_id
            WHERE ${mCond("c.marketer_id")}
            ORDER BY c.report_date DESC, c.gross_revenue DESC NULLS LAST`
        ).all() as Promise<any[]>,
    ]);

  const affiliates = plain(affiliateRows).map((a: any) => ({
    ...a,
    links: profileRows.filter((p: any) => p.user_id === a.id),
  }));

  // plain() strips the postgres.js row prototype so Next can serialise these
  // across the server/client boundary.
  return (
    <MarketerShell user={user} affiliates={affiliates} lives={plain(lives)}
      unknowns={plain(unknowns)} salesLive={plain(salesLive)}
      salesProduct={plain(salesProduct)}
      overall={plain(overall)} posts={plain(posts)}
      creatorReports={plain(creatorReports)}
      liveUsers={plain(liveUsers)} liveSessions={plain(liveSessions)}
      dataQuality={plain(dataQuality)} salesCard={plain(salesCard)}
      spendTtm={plain(spendTtm)} reportingSheet={plain(reportingSheet)}
      salesLiveCampaign={plain(salesLiveCampaign)} salesProductCampaign={plain(salesProductCampaign)}
      marketers={plain(marketers)} viewMid={selMid} />
  );
}
