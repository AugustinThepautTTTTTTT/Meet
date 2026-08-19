import { redirect } from "next/navigation";
import { getAccountId } from "@/lib/auth";
import AccountForm from "./account-form";

export default async function LawyerAccountPage() {
  if (await getAccountId()) redirect("/lawyer/dashboard");
  return <AccountForm googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} />;
}
