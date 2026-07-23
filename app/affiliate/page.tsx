import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import db from "@/lib/db";
import Header from "@/components/Header";
import AffiliateDashboard from "./AffiliateDashboard";
import PendingApproval from "./PendingApproval";

export const dynamic = "force-dynamic";

// A page render is a handful of small queries. If it has not finished well
// inside this, something is wedged — fail fast rather than holding the
// invocation open for the platform's five-minute maximum.
export const maxDuration = 20;


export default async function AffiliatePage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "affiliate") redirect("/marketer");

  // The dashboard unlocks only when the marketer presses Activate. Until then
  // the affiliate sits on a frozen waiting page — even after admin assigns a
  // marketer, because the marketer still has to set up their TikTok links
  // first. `activated` is read fresh from the DB so activation takes effect on
  // the next page load without a re-login.
  const me = (await db
    .prepare(
      `SELECT u.marketer_id, u.activated
         FROM users u WHERE u.id = ?`
    )
    .get(user.id)) as {
    marketer_id: number | null;
    activated: boolean;
  } | undefined;

  return (
    <div className="min-h-screen">
      <Header user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {me?.activated ? (
          <AffiliateDashboard />
        ) : (
          <PendingApproval userName={user.name} />
        )}
      </main>
    </div>
  );
}
