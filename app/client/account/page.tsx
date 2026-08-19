import ClientAccount from "./client-account";

export const metadata = { title: "Your requests — Meet" };

export default function ClientAccountPage() {
  return <ClientAccount googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} />;
}
