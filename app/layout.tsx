import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import NavProgress from "@/components/NavProgress";

// Typography: "Friendly SaaS" pairing — single versatile family.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.nlaffliatearmy.com"),
  title: "NL Affiliate Army — Live. Post. Dapat Komisyen.",
  description:
    "Sertai NL Affiliate Army: kami supply video AI, susun reporting anda, dan bayar komisyen tinggi. Daftar percuma.",
  openGraph: {
    title: "NL Affiliate Army — Live. Post. Dapat Komisyen.",
    description:
      "Video AI percuma, reporting tersusun, komisyen tinggi. Daftar percuma sebagai affiliate.",
    url: "https://www.nlaffliatearmy.com",
    siteName: "NL Affiliate Army",
    locale: "ms_MY",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <NavProgress />
        {children}
      </body>
    </html>
  );
}
