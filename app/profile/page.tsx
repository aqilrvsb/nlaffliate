import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Header from "@/components/Header";
import ProfileSettings from "./ProfileSettings";

// A page render is a handful of small queries. If it has not finished well
// inside this, something is wedged — fail fast rather than holding the
// invocation open for the platform's five-minute maximum.
export const maxDuration = 20;

export default async function ProfilePage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <Header user={user} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <ProfileSettings role={user.role} />
      </main>
    </div>
  );
}
