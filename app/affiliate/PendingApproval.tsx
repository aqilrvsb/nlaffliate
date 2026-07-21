import Link from "next/link";
import { Hourglass, Settings, ShieldCheck, UserCheck, Lock } from "lucide-react";

/**
 * Shown instead of the dashboard while an affiliate has no marketer.
 * Everything except profile settings is withheld until admin assigns one,
 * so a half-usable dashboard never appears.
 */
export default function PendingApproval({ userName }: { userName: string }) {
  return (
    <div className="mx-auto max-w-xl space-y-6 py-6">
      <div className="card text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <Hourglass className="h-7 w-7" aria-hidden="true" />
        </span>

        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          Hi {userName}, akaun anda sedang disemak
        </h1>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-muted-fg">
          Pendaftaran anda sudah diterima. Admin akan assign anda kepada seorang
          marketer terlebih dahulu. Selepas itu, semua fungsi dashboard akan
          terbuka secara automatik.
        </p>

        <div className="mt-6 space-y-2 text-left">
          {[
            { Icon: UserCheck, t: "Pendaftaran diterima", done: true },
            { Icon: ShieldCheck, t: "Menunggu admin assign marketer", done: false },
            { Icon: Lock, t: "Dashboard dibuka", done: false },
          ].map(({ Icon, t, done }) => (
            <div
              key={t}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                done
                  ? "border-emerald-200 bg-emerald-50/60"
                  : "border-line bg-white/60"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  done ? "text-emerald-600" : "text-muted-fg"
                }`}
                aria-hidden="true"
              />
              <span
                className={`text-sm ${
                  done ? "font-semibold text-ink" : "text-muted-fg"
                }`}
              >
                {t}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-muted-fg">
          Muat semula halaman ini selepas admin assign anda.
        </p>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">Sementara menunggu</p>
          <p className="text-sm text-muted-fg">
            Lengkapkan profil dan tambah link TikTok anda dahulu.
          </p>
        </div>
        <Link href="/profile" className="btn !py-2">
          <Settings className="h-4 w-4" aria-hidden="true" />
          Profile &amp; TikTok links
        </Link>
      </div>
    </div>
  );
}
