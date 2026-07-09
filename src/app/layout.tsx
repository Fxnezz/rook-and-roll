import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/ui/Header";
import { isMaintenance, getBroadcast } from "@/lib/admin/config";
import { auth } from "@/lib/auth/auth";
import { MaintenanceScreen } from "@/components/ui/MaintenanceScreen";
import { BroadcastBanner } from "@/components/ui/BroadcastBanner";

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
  metadataBase: new URL(process.env.AUTH_URL ?? "https://rook-and-roll.vercel.app"),
  title: {
    default: "Rook & Roll — Play Chess",
    template: "%s · Rook & Roll",
  },
  description:
    "A fast, modern place to play chess. Pass-and-play, bots, and online — original board, original pieces, no clutter.",
  applicationName: "Rook & Roll",
  openGraph: {
    title: "Rook & Roll — Play Chess",
    description: "Play online, battle Stockfish bots, and solve puzzles. Chess, without the clutter.",
    siteName: "Rook & Roll",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rook & Roll — Play Chess",
    description: "Play online, battle Stockfish bots, and solve puzzles. Chess, without the clutter.",
  },
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
              {broadcast && <BroadcastBanner broadcast={broadcast} />}
              <Header />
              <main className="flex-1">{children}</main>
            </>
          )}
        </Providers>
      </body>
    </html>
  );
}
