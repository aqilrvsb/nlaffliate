import Link from "next/link";
import { UserRound, Megaphone, ChevronRight } from "lucide-react";
import AuthShell from "@/components/AuthShell";

const options = [
  {
    href: "/registeraffliate",
    title: "Affiliate",
    desc: "Go live, schedule sessions and upload your results.",
    Icon: UserRound,
    tone: "bg-primary/10 text-primary",
  },
  {
    href: "/registermarketer",
    title: "Marketer",
    desc: "Track the affiliates assigned to you and their sales.",
    Icon: Megaphone,
    tone: "bg-accent/10 text-accent",
  },
];

export default function RegisterChooser() {
  return (
    <AuthShell subtitle="How do you want to join?">
      <div className="space-y-3">
        {options.map(({ href, title, desc, Icon, tone }) => (
          <Link key={href} href={href}
            className="card group flex cursor-pointer items-center gap-3 transition-all duration-200 hover:shadow-glass hover:-translate-y-0.5">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-ink">Sign up as {title}</span>
              <span className="block text-xs text-muted-fg">{desc}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-fg transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true" />
          </Link>
        ))}

        <p className="pt-1 text-center text-sm text-muted-fg">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">Log in</Link>
        </p>
      </div>
    </AuthShell>
  );
}
