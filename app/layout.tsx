import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DealRoom OS — Bank Outreach Command Center & CRM",
  description: "Personalized capital raise outreach engine with 30-day anti-fatigue cooldowns, open & click telemetry, and 1-click Gmail dispatch.",
  robots: "noindex, nofollow"
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0B0F19] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
