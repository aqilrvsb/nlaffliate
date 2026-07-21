import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import UgcVideo from "@/components/UgcVideo";
import {
  Radio, ArrowRight, Wallet, BarChart3, Sparkles, CalendarClock,
  ShieldCheck, Users, TrendingUp, Video, CheckCircle2, Star,
  UserPlus, Link2, Upload, ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

const BENEFITS = [
  {
    Icon: Wallet,
    title: "Komisyen Tinggi",
    body: "Setiap jualan masa live anda dikira automatik. Tiada potongan tersembunyi, tiada kira manual — GMV anda terus nampak dalam dashboard.",
    tone: "from-amber-400 to-yellow-500",
  },
  {
    Icon: BarChart3,
    title: "Reporting Tersusun",
    body: "Sales, viewers, item sold, durasi live — semua tersusun kemas ikut tarikh. Tak payah simpan screenshot dalam folder lagi.",
    tone: "from-emerald-500 to-emerald-600",
  },
  {
    Icon: Sparkles,
    title: "Kami Supply Video AI",
    body: "Kami hantar video UGC siap pakai terus ke dashboard anda — lengkap dengan caption, cover, dan teks. Anda cuma post.",
    tone: "from-primary to-primary-hover",
  },
  {
    Icon: CalendarClock,
    title: "Jadual Live Fleksibel",
    body: "Pilih tarikh dan masa anda sendiri (waktu Malaysia). Sampai 4 akaun TikTok boleh diurus dalam satu tempat.",
    tone: "from-violet-500 to-purple-600",
  },
  {
    Icon: ShieldCheck,
    title: "Rekod Yang Telus",
    body: "Setiap live ada bukti screenshot. Tiada pertikaian pasal angka — anda dan marketer nampak data yang sama.",
    tone: "from-sky-500 to-blue-600",
  },
  {
    Icon: Users,
    title: "Ada Marketer Bantu Anda",
    body: "Anda bukan berseorangan. Marketer akan set budget ads dan pantau prestasi live anda supaya sales naik.",
    tone: "from-rose-500 to-pink-600",
  },
];

// UGC covers + hero clip generated with PeningLab (nano-banana-pro / gemini)
// and served from its CDN — the same pipeline that supplies affiliates.
const CDN =
  "https://peninglab-content.s3.us-east-005.backblazeb2.com/users/f0fd6781-ed5f-4aa8-a5b9-eec943229092";

const HERO_VIDEO = `${CDN}/ugc/93e75e1e-4994-4692-9e74-208388e16d0b.mp4`;
const SUPPLY_VIDEO =
  "https://s.apipod.ai/videos/2026/07/21/21396d1b-98cc-42af-89b8-17fc8e0c2542.mp4";

const UGC_COVERS = [
  { t: "RAMAI BELI?", s: "PATUTLAH RAMBUT DAH TAK GUGUR", src: `${CDN}/image/39ea995e-dce7-495c-aee3-9e8e3b142595.png` },
  { t: "GLOW DALAM 7 HARI", s: "Serum viral no.1", src: `${CDN}/image/f1d915eb-cae2-4632-895d-ff8867839560.png` },
  { t: "STOK NAK HABIS", s: "Restock terhad minggu ni", src: `${CDN}/image/0bf5637d-51fb-4ae3-aee5-702f7ea8caed.png` },
  { t: "REVIEW JUJUR", s: "Sebelum vs selepas", src: `${CDN}/image/b014accb-0418-4398-b6d6-e3556b0bf826.png` },
];

const STEPS = [
  { Icon: UserPlus, title: "Daftar", body: "Isi nama, WhatsApp, email dan alamat. Ambil masa bawah 1 minit." },
  { Icon: Link2, title: "Letak Link TikTok", body: "Masukkan sampai 4 link profil TikTok anda dalam Profile Settings." },
  { Icon: CalendarClock, title: "Jadual Live", body: "Pilih tarikh & masa live. Status mula sebagai Pending." },
  { Icon: Upload, title: "Upload Result", body: "Habis live, upload screenshot. AI baca GMV, viewers, item sold automatik." },
];

const FAQ = [
  {
    q: "Ada bayaran untuk join?",
    a: "Tiada. Pendaftaran affiliate adalah percuma sepenuhnya. Anda hanya perlu live dan post — kami uruskan video, reporting dan tracking.",
  },
  {
    q: "Saya tak reti buat video, boleh join ke?",
    a: "Boleh. Itu sebab kami supply video AI siap pakai — lengkap dengan caption, main text, sub text dan cover. Anda cuma download dan post ke TikTok.",
  },
  {
    q: "Macam mana sales saya dikira?",
    a: "Selepas setiap live, anda upload screenshot recap TikTok. AI kami (Gemini 2.5 Flash) baca GMV, viewers, item sold dan durasi terus dari gambar — jadi tiada salah kira.",
  },
  {
    q: "Berapa akaun TikTok boleh saya guna?",
    a: "Sampai 4 link profil TikTok dalam satu akaun. Setiap jadual live boleh pilih profil mana yang akan digunakan.",
  },
  {
    q: "Data saya selamat?",
    a: "Ya. Setiap affiliate hanya nampak data sendiri. Marketer hanya nampak affiliate yang ditugaskan kepada mereka.",
  },
];

export default async function Home() {
  // Signed-in users go straight to their dashboard.
  const user = await getSession();
  if (user) {
    if (user.role === "admin") redirect("/admin");
    if (user.role === "marketer") redirect("/marketer");
    redirect("/affiliate");
  }

  return (
    <div className="min-h-screen">
      {/* ── Nav ───────────────────────────────────────── */}
      <header className="glass sticky top-0 z-30 rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-fg shadow-lift">
              <Radio className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-base font-extrabold tracking-tight text-ink">
              NL Affiliate Army
            </span>
          </span>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost !py-2 text-sm">Log Masuk</Link>
            <Link href="/registeraffliate" className="btn !py-2 text-sm">
              Daftar Percuma
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-14 pt-14 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="chip mb-4 bg-primary/10 text-primary">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Pendaftaran affiliate dibuka
            </span>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Live. Post.{" "}
              <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
                Dapat Komisyen.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-fg">
              Sertai <b className="text-ink">NL Affiliate Army</b> — kami supply video AI,
              susun reporting anda, dan bayar komisyen tinggi. Anda fokus buat live,
              kami uruskan yang lain.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/registeraffliate" className="btn !px-6 !py-3 text-base">
                Daftar Sebagai Affiliate
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/login" className="btn-ghost !px-6 !py-3 text-base">
                Sudah ada akaun? Log masuk
              </Link>
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-fg">
              {["Percuma untuk sertai", "Tiada kontrak", "Video AI disediakan"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Sample AI video + dashboard preview */}
          <div className="grid gap-4 sm:grid-cols-[minmax(0,190px)_1fr]">
            <UgcVideo
              src={HERO_VIDEO}
              label="Contoh video AI"
              className="mx-auto aspect-[9/16] w-full max-w-[190px]"
            />

          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-ink">Live Results</span>
              <span className="chip bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />Completed
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { Icon: TrendingUp, v: "RM333.70", l: "Total Sales" },
                { Icon: Users, v: "172", l: "Viewers" },
                { Icon: Video, v: "3", l: "Items Sold" },
                { Icon: CalendarClock, v: "2h 0m 25s", l: "Duration" },
              ].map(({ Icon, v, l }) => (
                <div key={l} className="rounded-xl border border-line bg-white/70 p-3 text-center">
                  <Icon className="mx-auto mb-1 h-3.5 w-3.5 text-muted-fg" aria-hidden="true" />
                  <p className="text-lg font-extrabold text-ink">{v}</p>
                  <p className="text-[11px] text-muted-fg">{l}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 p-3 text-center text-white">
                <p className="text-sm font-extrabold">RM50</p><p className="text-[10px] opacity-90">Budget</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-3 text-center text-white">
                <p className="text-sm font-extrabold">RM45</p><p className="text-[10px] opacity-90">Spend</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 text-center text-white">
                <p className="text-sm font-extrabold">7.42</p><p className="text-[10px] opacity-90">ROI</p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-fg">
              <Sparkles className="h-3 w-3 text-accent" aria-hidden="true" />
              Angka dibaca automatik dari screenshot oleh AI
            </p>
          </div>
          </div>
        </div>
      </section>

      {/* ── Benefits ──────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Kenapa join NL Affiliate Army?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-fg">
            Kami bukan sekadar bagi link. Kami bagi anda alat, video, dan data
            untuk betul-betul naikkan sales.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ Icon, title, body, tone }) => (
            <div key={title} className="card transition-transform duration-200 hover:-translate-y-1">
              <span className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-lift`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mb-1.5 font-bold text-ink">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-fg">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Macam mana ia berfungsi
          </h2>
          <p className="mt-3 text-muted-fg">Empat langkah. Itu sahaja.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ Icon, title, body }, i) => (
            <div key={title} className="card relative">
              <span className="absolute right-4 top-4 text-3xl font-extrabold text-primary/15">
                {i + 1}
              </span>
              <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mb-1.5 font-bold text-ink">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-fg">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI video supply ───────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="card grid items-center gap-8 lg:grid-cols-[1fr_minmax(0,380px)]">
          <div>
            <span className="chip mb-3 bg-accent/10 text-accent">
              <Video className="h-3 w-3" aria-hidden="true" />Video AI Percuma
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              Kami hantar video siap pakai terus ke dashboard anda
            </h2>
            <p className="mt-3 leading-relaxed text-muted-fg">
              Tak perlu shoot, tak perlu edit. Setiap video datang lengkap dengan
              caption Bahasa Melayu, main text, sub text dan image cover — anda
              cuma download, post ke TikTok, dan letak link.
            </p>
            <ul className="mt-5 space-y-2">
              {[
                "Video UGC dijana AI, siap untuk post",
                "Caption Bahasa Melayu yang natural",
                "Cover image + teks disediakan",
                "Letak link TikTok, terus masuk Done Post",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-ink">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* One live clip + three covers. Capped width so this column's
              height stays near the copy's — a full-width 2×2 of 9:16 tiles
              ran ~950px tall and left the text stranded in dead space. */}
          <div className="mx-auto grid w-full max-w-[380px] grid-cols-2 gap-3">
            <UgcVideo
              src={SUPPLY_VIDEO}
              label="Video AI kami"
              className="aspect-[9/16] w-full"
            />
            {UGC_COVERS.slice(1).map(({ t, s, src }) => (
              <div key={t} className="relative aspect-[9/16] overflow-hidden rounded-xl shadow-lift">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
                {/* Gradient scrim so the caption stays legible over any frame */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                  <p className="text-sm font-extrabold leading-tight drop-shadow">{t}</p>
                  <p className="mt-1 text-[10px] leading-tight opacity-90 drop-shadow">{s}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-14">
        <h2 className="mb-8 text-center text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Soalan lazim
        </h2>
        <div className="space-y-3">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="card group">
              <summary className="flex cursor-pointer items-center justify-between gap-3 font-bold text-ink marker:content-['']">
                {q}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-fg transition-transform duration-200 group-open:rotate-90" aria-hidden="true" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-fg">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-hover p-8 text-center text-white shadow-glass sm:p-12">
          <Star className="mx-auto mb-3 h-8 w-8 opacity-90" aria-hidden="true" />
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Sedia untuk mula?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/90">
            Daftar percuma hari ini. Dapat video AI, reporting tersusun, dan
            komisyen tinggi — semua dalam satu dashboard.
          </p>
          <Link
            href="/registeraffliate"
            className="mt-7 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-7 py-3 text-base font-bold text-primary shadow-lift transition-transform duration-200 hover:scale-[1.02]"
          >
            Daftar Sebagai Affiliate
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted-fg">
          <span className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="font-bold text-ink">NL Affiliate Army</span>
          </span>
          <span className="flex items-center gap-4">
            <Link href="/login" className="hover:text-primary">Log Masuk</Link>
            <Link href="/registeraffliate" className="hover:text-primary">Daftar Affiliate</Link>
            <Link href="/registermarketer" className="hover:text-primary">Daftar Marketer</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
