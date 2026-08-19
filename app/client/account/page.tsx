import ClientAccount from "./client-account";

export const metadata = { title: "Vos demandes — Repere" };

export default function ClientAccountPage() {
  return <ClientAccount googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} />;
}
