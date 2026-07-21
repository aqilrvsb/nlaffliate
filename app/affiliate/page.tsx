import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import db from "@/lib/db";
import Header from "@/components/Header";
import AffiliateDashboard from "./AffiliateDashboard";
import PendingApproval from "./PendingApproval";

export const dynamic = "force-dynamic";

export default async function AffiliatePage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "affiliate") redirect("/marketer");

  // A fresh affiliate has no marketer yet. Until admin assigns one there is
  // nothing meaningful to show, so the whole dashboard stays locked.
  const me = (await db
    .prepare(
      `SELECT u.marketer_id, m.name AS marketer_name, m.wa_group_url
         FROM users u
         LEFT JOIN users m ON m.id = u.marketer_id
        WHERE u.id = ?`
    )
    .get(user.id)) as {
    marketer_id: number | null;
    marketer_name: string | null;
    wa_group_url: string | null;
  } | undefined;

  return (
    <div className="min-h-screen">
      <Header user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {me?.marketer_id ? (
          <AffiliateDashboard
            userName={user.name}
            marketerName={me.marketer_name}
            waGroupUrl={me.wa_group_url}
          />
        ) : (
          <PendingApproval userName={user.name} />
        )}
      </main>
    </div>
  );
}
