import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { LayoutWrapper } from "@/components/layout/layout-wrapper";
import React, { Suspense } from "react";
import { cookies } from "next/headers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "TruFlow & Zeetork | Business Intelligence Dashboard",
  description:
    "Centralized executive sales, finance, and customer intelligence platform combining Zoho Books and Visit Management data.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const initialPeriod = cookieStore.get("dashboard_period")?.value || "this_month";
  const initialOrg = cookieStore.get("dashboard_org")?.value || "";
  const initialStartDate = cookieStore.get("dashboard_start_date")?.value || "";
  const initialEndDate = cookieStore.get("dashboard_end_date")?.value || "";

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased bg-slate-50`}>
      <body className="min-h-full flex bg-slate-50 text-slate-900 overflow-x-hidden antialiased">
        <LayoutWrapper
          sidebar={
            <Suspense fallback={<aside className="w-64 flex-shrink-0 h-screen bg-white border-r border-slate-200" />}>
              <Sidebar
                initialPeriod={initialPeriod}
                initialOrg={initialOrg}
                initialStartDate={initialStartDate}
                initialEndDate={initialEndDate}
              />
            </Suspense>
          }
          header={
            <Suspense fallback={<div className="h-16 border-b border-slate-200 bg-white" />}>
              <Header
                initialPeriod={initialPeriod}
                initialOrg={initialOrg}
                initialStartDate={initialStartDate}
                initialEndDate={initialEndDate}
              />
            </Suspense>
          }
        >
          <Suspense fallback={<div className="text-center py-20 text-slate-500">Loading intelligence...</div>}>
            {children}
          </Suspense>
        </LayoutWrapper>
      </body>
    </html>
  );
}
