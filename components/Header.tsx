import Link from "next/link";
import LogoutButton from "./LogoutButton";
import { SessionUser } from "@/lib/session";
import { Radio, ShieldCheck, Megaphone, UserRound } from "lucide-react";

const roleMeta: Record<string, { chip: string; Icon: typeof Radio }> = {
  admin: { chip: "bg-accent/10 text-accent", Icon: ShieldCheck },
  marketer: { chip: "bg-secondary/20 text-ink", Icon: Megaphone },
  affiliate: { chip: "bg-primary/10 text-primary", Icon: UserRound },
};

export default function Header({ user }: { user: SessionUser }) {
  const meta = roleMeta[user.role] ?? roleMeta.affiliate;
  const RoleIcon = meta.Icon;

  return (
    <header className="glass sticky top-0 z-20 rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-fg shadow-lift">
            <Radio className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="truncate text-base font-extrabold tracking-tight text-ink">
            NL Affiliate Army
          </span>
          <span className={`chip ${meta.chip} hidden sm:inline-flex`}>
            <RoleIcon className="h-3 w-3" aria-hidden="true" />
            {user.role}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/profile"
            className="group flex items-center gap-2.5 rounded-xl px-1 py-1 transition-colors duration-200 hover:bg-white/60"
            title="Profile settings">
            <span className="hidden text-right md:block">
              <span className="block text-sm font-semibold leading-tight text-ink">{user.name}</span>
              <span className="block font-mono text-xs leading-tight text-muted-fg">{user.staff_id}</span>
            </span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white shadow-lift transition-transform duration-200 group-hover:scale-105">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
