import { redirect } from "next/navigation";
import { getAccountId } from "@/lib/auth";
import Dashboard from "./dashboard";

export default async function LawyerDashboardPage() {
  if (!(await getAccountId())) redirect("/lawyer/account");
  return <Dashboard />;
}
