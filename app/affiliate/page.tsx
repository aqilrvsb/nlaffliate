import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Header from "@/components/Header";
import AffiliateDashboard from "./AffiliateDashboard";

export const dynamic = "force-dynamic";

export default async function AffiliatePage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "affiliate") redirect("/marketer");

  return (
    <div className="min-h-screen">
      <Header user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <AffiliateDashboard userName={user.name} />
      </main>
    </div>
  );
}
