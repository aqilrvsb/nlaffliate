import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The brands a marketer holds and the products under them — the detail behind
 * the Brand/Product counts on the admin List Marketer table.
 *
 * Products hang off the shared catalogue brand, so they're resolved through
 * each copy's COALESCE(catalogue_id, id); every marketer working a brand sees
 * the same products.
 */
export async function GET(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const marketerId = Number(new URL(req.url).searchParams.get("marketer_id"));
  if (!Number.isFinite(marketerId))
    return NextResponse.json({ error: "marketer_id required" }, { status: 400 });

  const brands = await db
    .prepare(
      `SELECT id, name FROM brands WHERE marketer_id = ? ORDER BY name`
    )
    .all<{ id: number; name: string }>(marketerId);

  const products = await db
    .prepare(
      `SELECT p.id, p.name, p.sku, b.name AS brand_name
         FROM products p
         LEFT JOIN brands b ON b.id = p.brand_id
        WHERE p.brand_id IN (
          SELECT COALESCE(catalogue_id, id) FROM brands WHERE marketer_id = ?
        )
        ORDER BY b.name NULLS LAST, p.name`
    )
    .all<{ id: number; name: string; sku: string | null; brand_name: string | null }>(marketerId);

  return NextResponse.json({ brands, products });
}
