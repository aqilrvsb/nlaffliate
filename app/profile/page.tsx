import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Header from "@/components/Header";
import ProfileSettings from "./ProfileSettings";

// Headroom for a cold Supabase pooler connect plus one in-layer retry; the db
// layer's per-query timeout is what actually fails a wedged socket.
export const maxDuration = 60;

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
