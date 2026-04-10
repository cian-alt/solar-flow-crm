import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Solar Flow CRM",
  description: "B2B Solar Energy Sales CRM — Ireland",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} font-sans antialiased bg-background`}>
        {/* Ambient background orbs */}
        <div className="orb-1" aria-hidden="true" />
        <div className="orb-2" aria-hidden="true" />
        <div className="orb-3" aria-hidden="true" />
        <div className="relative z-10">
          {children}
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.8)",
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(31,38,135,0.12)",
              fontFamily: "var(--font-dm-sans)",
              color: "#0F172A",
            },
          }}
        />
      </body>
    </html>
  );
}
