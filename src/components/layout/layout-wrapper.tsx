"use client";

import React from "react";
import { usePathname } from "next/navigation";

export function LayoutWrapper({
  sidebar,
  header,
  children,
}: {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4">
        {children}
      </main>
    );
  }

  return (
    <>
      {sidebar}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {header}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 bg-slate-50">
          {children}
        </main>
      </div>
    </>
  );
}

