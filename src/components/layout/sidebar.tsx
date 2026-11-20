"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  FileSpreadsheet,
  GitCommitHorizontal,
  ShoppingCart,
  Receipt,
  Users,
  MapPin,
  FileBarChart2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Activity,
  Target,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  initialPeriod?: string;
  initialOrg?: string;
  initialStartDate?: string;
  initialEndDate?: string;
}

export function Sidebar({
  initialPeriod = "this_month",
  initialOrg = "",
  initialStartDate = "",
  initialEndDate = "",
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const getHrefWithParams = (baseHref: string) => {
    if (baseHref.startsWith("/settings")) return baseHref;

    const currentPeriod = searchParams.get("period") || initialPeriod || "this_month";
    const urlOrg = searchParams.get("organizationId");
    const effectiveOrg = urlOrg !== null ? (urlOrg === "all" ? "" : urlOrg) : (initialOrg === "all" ? "" : initialOrg);

    const params = new URLSearchParams();
    if (currentPeriod) {
      params.set("period", currentPeriod);
    }
    if (effectiveOrg && effectiveOrg !== "all" && effectiveOrg !== "") {
      params.set("organizationId", effectiveOrg);
    }
    if (currentPeriod === "custom") {
      const start = searchParams.get("startDate") || initialStartDate;
      const end = searchParams.get("endDate") || initialEndDate;
      if (start) params.set("startDate", start);
      if (end) params.set("endDate", end);
    }

    const qs = params.toString();
    return qs ? `${baseHref}?${qs}` : baseHref;
  };

  const navGroups: NavGroup[] = [
    {
      title: "General",
      items: [
        { name: "Overview Dashboard", href: "/", icon: LayoutDashboard },
      ],
    },
    {
      title: "Sales Analytics",
      items: [
        { name: "Quotations", href: "/sales/quotations", icon: FileSpreadsheet },
        { name: "Order Conversion", href: "/sales/conversions", icon: GitCommitHorizontal },
        { name: "Sales Orders", href: "/sales/orders", icon: ShoppingCart },
        { name: "Sales Targets", href: "/target", icon: Target },
      ],
    },
    {
      title: "Finance & Revenue",
      items: [
        { name: "Invoices & Receivables", href: "/finance", icon: Receipt },
      ],
    },
    {
      title: "Customer Intelligence",
      items: [
        { name: "Customer Analytics", href: "/customers", icon: Users },
      ],
    },
    {
      title: "Field Activity",
      items: [
        { name: "Visit Analytics", href: "/visits", icon: MapPin },
      ],
    },
    // {
    //   title: "Executive Reports",
    //   items: [
    //     { name: "Weekly & Monthly Reports", href: "/reports", icon: FileBarChart2 },
    //   ],
    // },
    {
      title: "System",
      items: [
        { name: "Sync & Data Health", href: "/settings/sync", icon: RefreshCw },
      ],
    },
  ];

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-screen sticky top-0 bg-white border-r border-slate-200 z-30 select-none shadow-[1px_0_4px_rgba(0,0,0,0.02)]">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-200 gap-3">
        <Link href={getHrefWithParams("/")} className="flex flex-col group cursor-pointer">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-black tracking-tight text-red-600 group-hover:text-red-700 transition-colors">TRUFLOW</span>
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider bg-orange-100/70 px-1.5 py-0.5 rounded">BI</span>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Business Intelligence</span>
        </Link>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => {
          const isCollapsed = collapsedGroups[group.title];
          return (
            <div key={group.title} className="space-y-1">
              <button
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase hover:text-slate-600 transition-colors"
              >
                <span>{group.title}</span>
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {!isCollapsed && (
                <div className="space-y-0.5 pt-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={getHrefWithParams(item.href)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                          isActive
                            ? "bg-orange-50 text-orange-600 font-semibold border border-orange-200/80 shadow-sm shadow-orange-500/5"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className={`w-4 h-4 transition-colors ${
                              isActive
                                ? "text-orange-600"
                                : "text-slate-400 group-hover:text-slate-600"
                            }`}
                          />
                          <span>{item.name}</span>
                        </div>
                        {isActive ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-600" />
                        ) : item.badge ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* System Status Footer Card */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50">
        <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-medium text-slate-600">Dual DB Sync</span>
          </div>
          <Link
            href="/settings/sync"
            className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold"
          >
            Health
          </Link>
        </div>
      </div>
    </aside>
  );
}
