import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Header from "@/components/Header";
import ProfileSettings from "./ProfileSettings";

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
