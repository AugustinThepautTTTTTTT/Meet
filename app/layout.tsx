import type { Metadata } from "next";
import { DM_Sans, Lora } from "next/font/google";
import "./meet-styles.css";
import { LocaleProvider } from "./components/locale-provider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const serif = Lora({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || "meet.vercel.app"}`,
  ),
  title: "Meet — Trouvez le bon avocat",
  description:
    "Décrivez votre situation juridique et rencontrez les avocats les plus adaptés.",
  openGraph: {
    title: "Rencontrez le bon avocat.",
    description: "Un accompagnement juridique clair commence par la bonne mise en relation.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rencontrez le bon avocat.",
    description: "Un accompagnement juridique clair commence par la bonne mise en relation.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${sans.variable} ${serif.variable}`}>
        <LocaleProvider>{children}</LocaleProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
