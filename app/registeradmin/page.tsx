import { redirect } from "next/navigation";

// There is one HQNL admin, provisioned out of band. Public admin registration
// used to be open here — a real hole — so this now just sends people to login.
export default function RegisterAdminPage() {
  redirect("/login");
}
