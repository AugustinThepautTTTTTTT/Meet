import { redirect } from "next/navigation";
import { getAccountId } from "@/lib/auth";
import AccountForm from "./account-form";

export default async function LawyerAccountPage() {
  if (await getAccountId()) redirect("/lawyer/dashboard");
  return <AccountForm />;
}
