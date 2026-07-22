import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Header from "@/components/Header";
import db from "@/lib/db";
import AdminDashboard from "./AdminDashboard";
import { resolveRange } from "@/lib/daterange";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; page?: string; all?: string };
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  const { from, to } = resolveRange({
    from: searchParams?.from ?? null,
    to: searchParams?.to ?? null,
    all: searchParams?.all ?? null,
  });
  // Date predicate reused by both the per-affiliate roll-up and the table.
  // NULL-safe: on the LEFT JOIN side we keep rows only when in range.
  const dateArgs: any[] = [];
  let dateWhere = "";
  if (from) { dateWhere += " AND b.live_date >= ?"; dateArgs.push(from); }
  if (to) { dateWhere += " AND b.live_date <= ?"; dateArgs.push(to); }

  // node:sqlite returns null-prototype rows; Next.js won't pass those to a
  // Client Component, so we shallow-clone each into a plain object.
  const plain = <T,>(rows: T[]): T[] => rows.map((r) => ({ ...r }));

  const marketers = plain(
    await db.prepare("SELECT id, name, email FROM users WHERE role = 'marketer' ORDER BY name")
      .all() as any[]
  );

  const affiliates = plain(await db.prepare(
      `SELECT u.id, u.name, u.email, u.phone, u.marketer_id,
              m.name AS marketer_name,
              COUNT(b.id) AS lives,
              SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) AS done,
              COALESCE(SUM(r.gmv), 0) AS gmv,
              COALESCE(SUM(r.items_sold), 0) AS items,
              COALESCE(SUM(r.viewers), 0) AS viewers
       FROM users u
       LEFT JOIN users m ON m.id = u.marketer_id
       LEFT JOIN bookings b ON b.user_id = u.id${dateWhere}
       LEFT JOIN live_results r ON r.booking_id = b.id
       WHERE u.role = 'affiliate'
       -- Postgres needs every non-aggregated column in GROUP BY
       -- (SQLite allowed bare columns).
       GROUP BY u.id, u.name, u.email, u.phone, u.marketer_id, m.name
       ORDER BY gmv DESC, u.name`
    )
    .all(...dateArgs) as any[]);

  const rows = plain(await db.prepare(
      `SELECT b.id AS booking_id, b.user_id AS affiliate_id,
              u.name AS affiliate, m.name AS marketer,
              b.profile_id, p.label AS profile_label, p.url AS profile_url,
              b.live_date, b.start_time, b.end_time, b.status,
              b.ads_budget, b.ad_spend, b.gross_revenue, b.roi,
              r.gmv, r.viewers, r.items_sold, r.duration_live, r.screenshot_path
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       LEFT JOIN users m ON m.id = u.marketer_id
       JOIN tiktok_profiles p ON p.id = b.profile_id
       LEFT JOIN live_results r ON r.booking_id = b.id
       WHERE 1=1${dateWhere}
       ORDER BY b.live_date DESC, b.start_time DESC`
    )
    .all(...dateArgs) as any[]);

  // Every affiliate's links, so the reporting tab can break commission down
  // per link exactly as the marketer console does.
  const links = plain(await db.prepare(
      `SELECT p.id, p.user_id, p.label, p.url, p.commission_type, p.commission_value
         FROM tiktok_profiles p
         JOIN users u ON u.id = p.user_id
        WHERE u.role = 'affiliate'
        ORDER BY p.id`
    ).all() as any[]);

  return (
    <div className="min-h-screen">
      <Header user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <AdminDashboard marketers={marketers} affiliates={affiliates}
          rows={rows} links={links} />
      </main>
    </div>
  );
}
