"use client";

import { useCallback, useEffect, useState } from "react";
import { Tag, Loader2, MessageCircle, Link2 } from "lucide-react";
import { handleFromUrl } from "@/lib/tiktok";

type ProfileBrand = { id: number; name: string; wa_group_url: string | null };
type Profile = { id: number; url: string; brands?: ProfileBrand[] };

/**
 * The brands this affiliate actually works, read-only.
 *
 * Brands are assigned per TikTok link by the marketer, and one brand can sit
 * on several links — so this groups by brand and lists the accounts under it,
 * which is the way round the affiliate thinks about it. Adding or renaming a
 * brand is the marketer's job; here it is only ever a view.
 */
export default function BrandsView() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const d = await fetch("/api/profiles").then((r) => r.json());
    setProfiles(d.profiles || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // brand -> the links running it
  const byBrand = new Map<number, { brand: ProfileBrand; links: Profile[] }>();
  for (const p of profiles) {
    for (const b of p.brands ?? []) {
      const entry = byBrand.get(b.id) ?? { brand: b, links: [] };
      entry.links.push(p);
      byBrand.set(b.id, entry);
    }
  }
  const groups = [...byBrand.values()].sort((a, b) =>
    a.brand.name.localeCompare(b.brand.name)
  );

  if (loading)
    return (
      <p className="flex items-center gap-2 text-sm text-muted-fg">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading…
      </p>
    );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="section-title">Brand</h2>
        <p className="text-sm text-muted-fg">
          Brand yang anda pegang, mengikut link profile. Marketer yang tetapkan
          brand pada setiap link.
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">
          Belum ada brand — marketer anda akan tetapkan brand pada link TikTok anda.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map(({ brand, links }) => (
            <div key={brand.id} className="card flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Tag className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{brand.name}</p>
                  <p className="text-xs text-muted-fg">
                    {links.length} link profile
                  </p>
                </div>
              </div>

              <ul className="space-y-1 border-t border-line pt-2">
                {links.map((l) => (
                  <li key={l.id}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 truncate text-xs text-accent hover:underline">
                      <Link2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{handleFromUrl(l.url)}</span>
                    </a>
                  </li>
                ))}
              </ul>

              {brand.wa_group_url ? (
                <a href={brand.wa_group_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors duration-200 hover:bg-emerald-700">
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Link Group WhatsApp
                </a>
              ) : (
                <p className="text-[11px] text-muted-fg/70">
                  Marketer belum tetapkan group WhatsApp untuk brand ini.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
