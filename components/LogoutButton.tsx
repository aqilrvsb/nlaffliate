"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button onClick={logout} className="btn-ghost !px-3 !py-2" aria-label="Log out">
      <LogOut className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">Log out</span>
    </button>
  );
}
