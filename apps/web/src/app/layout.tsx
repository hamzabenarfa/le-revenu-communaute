import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Suspense } from "react";
import { SessionBoundary, ShellFallback } from "@/components/shell";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["700", "900"],
});
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Communauté Le Revenu",
    template: "%s · Communauté Le Revenu",
  },
  description:
    "Posez vos questions d'argent, partagez vos expériences et échangez avec la rédaction du Revenu.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${playfair.variable} ${inter.variable}`}>
      <body>
        <a className="skip" href="#contenu">
          Aller au contenu
        </a>
        <Suspense fallback={<ShellFallback />}>
          <SessionBoundary>{children}</SessionBoundary>
        </Suspense>
      </body>
    </html>
  );
}
