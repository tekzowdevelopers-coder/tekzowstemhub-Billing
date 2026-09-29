import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "Tekzow STEMHub - Student Fee & Billing Management System",
  description: "Multi-branch SaaS fee and billing management platform for Tekzow STEMHub and franchise branches",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans text-slate-800 bg-slate-50 min-h-screen">
        <Navigation>{children}</Navigation>
      </body>
    </html>
  );
}