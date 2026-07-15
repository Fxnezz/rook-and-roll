import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/ui/Header";
import { isMaintenance, getBroadcast } from "@/lib/admin/config";
import { auth } from "@/lib/auth/auth";
import { MaintenanceScreen } from "@/components/ui/MaintenanceScreen";
import { BroadcastBanner } from "@/components/ui/BroadcastBanner";
import { SiteFooter } from "@/components/ui/SiteFooter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The root layout reads live config (maintenance mode, broadcast) and the admin
// session per request, so it must not be statically cached.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL ?? "https://sams-arcade.vercel.app"),
  title: {
    default: "Sam's Arcade — Chess, Strategy & More",
    template: "%s · Sam's Arcade",
  },
  description:
    "Play chess online, challenge personality-driven bots, train your skills, and explore a growing arcade of original games.",
  applicationName: "Sam's Arcade",
  openGraph: {
    title: "Sam's Arcade — Chess, Strategy & More",
    description: "Play online, challenge chess bots, solve puzzles, and explore a full games arcade.",
    siteName: "Sam's Arcade",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sam's Arcade — Chess, Strategy & More",
    description: "Play online, challenge chess bots, solve puzzles, and explore a full games arcade.",
  },
  appleWebApp: {
    capable: true,
    title: "Sam's Arcade",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e1117",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Maintenance mode: non-admins see a "back soon" screen; admins pass through.
  const maintenance = await isMaintenance();
  const session = maintenance ? await auth() : null;
  const blocked = maintenance && !session?.user?.isAdmin;
  const broadcast = blocked ? null : await getBroadcast();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          {blocked ? (
            <MaintenanceScreen />
          ) : (
            <>
              {broadcast && <div className="md:pl-[232px]"><BroadcastBanner broadcast={broadcast} /></div>}
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[var(--accent)] focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-[var(--accent-contrast)] focus:shadow-[var(--shadow-md)] md:focus:left-[248px]"
              >
                Skip to main content
              </a>
              <Header />
              <main id="main-content" tabIndex={-1} className="flex-1 md:pl-[232px]">{children}</main>
              <SiteFooter />
            </>
          )}
        </Providers>
      </body>
    </html>
  );
}
