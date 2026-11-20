"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { RefreshCw, Building2, Calendar, X, LogOut } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { getClientCookie, setClientCookie } from "@/lib/client-cookies";

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
      return `${months[monthIdx]} ${day}`;
    }
  }
  return dateStr;
}

interface HeaderProps {
  initialPeriod?: string;
  initialOrg?: string;
  initialStartDate?: string;
  initialEndDate?: string;
}

export function Header({
  initialPeriod = "this_month",
  initialOrg = "",
  initialStartDate = "",
  initialEndDate = "",
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlPeriod = searchParams.get("period");
  const urlOrg = searchParams.get("organizationId");
  const urlStartDate = searchParams.get("startDate");
  const urlEndDate = searchParams.get("endDate");

  const [cookiePeriod, setCookiePeriod] = useState<string>(initialPeriod);
  const [cookieOrg, setCookieOrg] = useState<string>(initialOrg === "all" ? "" : initialOrg);
  const [cookieStartDate, setCookieStartDate] = useState<string>(initialStartDate);
  const [cookieEndDate, setCookieEndDate] = useState<string>(initialEndDate);

  const currentPeriod = urlPeriod || cookiePeriod || "this_month";
  const currentOrg = urlOrg !== null ? (urlOrg === "all" ? "" : urlOrg) : cookieOrg;
  const currentStartDate = urlStartDate || (currentPeriod === "custom" ? cookieStartDate : "");
  const currentEndDate = urlEndDate || (currentPeriod === "custom" ? cookieEndDate : "");

  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customStartInput, setCustomStartInput] = useState<string>(currentStartDate || "");
  const [customEndInput, setCustomEndInput] = useState<string>(currentEndDate || "");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cp = getClientCookie("dashboard_period");
    const co = getClientCookie("dashboard_org");
    const cs = getClientCookie("dashboard_start_date");
    const ce = getClientCookie("dashboard_end_date");
    if (cp) setCookiePeriod(cp);
    if (co) setCookieOrg(co === "all" ? "" : co);
    if (cs) setCookieStartDate(cs);
    if (ce) setCookieEndDate(ce);

    // If active URL is missing params but cookies exist, seamlessly sync the URL
    // so all browser features, bookmarks, and server queries align
    if (urlPeriod === null && cp && cp !== "this_month") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("period", cp);
      if (urlOrg === null && co && co !== "all") {
        params.set("organizationId", co);
      }
      if (cp === "custom" && cs && ce) {
        if (!params.has("startDate")) params.set("startDate", cs);
        if (!params.has("endDate")) params.set("endDate", ce);
      }
      router.replace(`${pathname}?${params.toString()}`);
    } else if (urlOrg === null && co && co !== "all" && co !== "") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("organizationId", co);
      if (urlPeriod === null && cp) {
        params.set("period", cp);
        if (cp === "custom" && cs && ce) {
          if (!params.has("startDate")) params.set("startDate", cs);
          if (!params.has("endDate")) params.set("endDate", ce);
        }
      }
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [pathname, searchParams, urlPeriod, urlOrg, router]);

  useEffect(() => {
    if (currentStartDate) setCustomStartInput(currentStartDate);
    if (currentEndDate) setCustomEndInput(currentEndDate);
  }, [currentStartDate, currentEndDate]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsCustomOpen(false);
      }
    };
    if (isCustomOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCustomOpen]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState("Checking sync...");

  useEffect(() => {
    fetchSyncInfo();
  }, []);

  const fetchSyncInfo = async () => {
    try {
      const res = await fetch("/api/sync/status");
      const data = await res.json();
      if (data.success && data.lastSuccessfulSync) {
        const d = new Date(data.lastSuccessfulSync);
        setSyncStatusText(`Last synced at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
      } else {
        setSyncStatusText("Ready to sync");
      }
    } catch {
      setSyncStatusText("Sync ready");
    }
  };

  const handleTriggerSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatusText("Syncing Zoho Books...");
    try {
      const res = await fetch("/api/sync/zoho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerType: "MANUAL" }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncStatusText("Sync completed!");
        fetchSyncInfo();
        router.refresh();
      } else {
        setSyncStatusText("Sync failed");
      }
    } catch {
      setSyncStatusText("Sync error");
    } finally {
      setIsSyncing(false);
    }
  };

  const setFilter = (key: string, val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "organizationId") {
      setClientCookie("dashboard_org", val || "all");
      setCookieOrg(val);
      if (val && val !== "all") {
        params.set("organizationId", val);
      } else {
        params.delete("organizationId");
      }
    } else if (key === "period") {
      setClientCookie("dashboard_period", val);
      setCookiePeriod(val);
      params.set("period", val);
      if (val !== "custom") {
        params.delete("startDate");
        params.delete("endDate");
        setClientCookie("dashboard_start_date", "");
        setClientCookie("dashboard_end_date", "");
        setCookieStartDate("");
        setCookieEndDate("");
        setIsCustomOpen(false);
      }
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const applyCustomRange = (start?: string, end?: string) => {
    const s = start || customStartInput;
    const e = end || customEndInput;
    if (!s || !e) return;

    let finalStart = s;
    let finalEnd = e;
    if (finalEnd < finalStart) {
      finalStart = e;
      finalEnd = s;
      setCustomStartInput(finalStart);
      setCustomEndInput(finalEnd);
    }

    setClientCookie("dashboard_period", "custom");
    setClientCookie("dashboard_start_date", finalStart);
    setClientCookie("dashboard_end_date", finalEnd);
    setCookiePeriod("custom");
    setCookieStartDate(finalStart);
    setCookieEndDate(finalEnd);

    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");
    params.set("startDate", finalStart);
    params.set("endDate", finalEnd);

    setIsCustomOpen(false);
    router.push(`${pathname}?${params.toString()}`);
  };

  const periods = [
    { label: "This Week", value: "this_week" },
    { label: "Last Week", value: "last_week" },
    { label: "This Month", value: "this_month" },
    { label: "Last Month", value: "last_month" },
    { label: "This Quarter", value: "this_quarter" },
    { label: "This Year", value: "this_year" },
    { label: "All Time", value: "all_time" },
  ];

  const customButtonLabel = useMemo(() => {
    if (currentPeriod === "custom" && currentStartDate && currentEndDate) {
      return `${formatDisplayDate(currentStartDate)} – ${formatDisplayDate(currentEndDate)}`;
    }
    return "Custom";
  }, [currentPeriod, currentStartDate, currentEndDate]);

  return (
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-20 sticky top-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* Left: Organization Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
          <Building2 className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
          <select
            value={currentOrg}
            onChange={(e) => setFilter("organizationId", e.target.value)}
            className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer"
          >
            <option value="" className="bg-white text-slate-800">All Organizations (TruFlow & Zeetork)</option>
            <option value="771755208" className="bg-white text-slate-800">TruFlow Solutions (INR)</option>
            <option value="876204905" className="bg-white text-slate-800">Zeetork Automation (INR)</option>
          </select>
        </div>
      </div>

      {/* Middle: Quick Date Period Selector & Custom Timeline */}
      <div className="relative hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
        {periods.map((p) => {
          const isSelected = currentPeriod === p.value;
          return (
            <button
              key={p.value}
              onClick={() => setFilter("period", p.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? "bg-orange-600 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              {p.label}
            </button>
          );
        })}

        {/* Custom Range Button */}
        <button
          onClick={() => setIsCustomOpen(!isCustomOpen)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            currentPeriod === "custom"
              ? "bg-orange-600 text-white font-semibold shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          }`}
          title="Filter by custom date range"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{customButtonLabel}</span>
        </button>

        {/* Custom Range Popover Dropdown */}
        {isCustomOpen && (
          <div
            ref={popoverRef}
            className="absolute top-full right-0 mt-2.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 text-slate-900 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-bold text-slate-800">Custom Date Range</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="py-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Quick Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Last 7 Days", days: 7 },
                  { label: "Last 14 Days", days: 14 },
                  { label: "Last 30 Days", days: 30 },
                  { label: "Last 90 Days", days: 90 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const start = new Date(today);
                      start.setDate(today.getDate() - preset.days);
                      const s = start.toISOString().split("T")[0];
                      const e = today.toISOString().split("T")[0];
                      setCustomStartInput(s);
                      setCustomEndInput(e);
                      applyCustomRange(s, e);
                    }}
                    className="px-2 py-1 bg-slate-50 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-600 transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Inputs */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={customStartInput}
                  onChange={(e) => setCustomStartInput(e.target.value)}
                  max={customEndInput || undefined}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={customEndInput}
                  onChange={(e) => setCustomEndInput(e.target.value)}
                  min={customStartInput || undefined}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3.5 mt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCustomOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => applyCustomRange()}
                disabled={!customStartInput || !customEndInput}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all shadow-xs cursor-pointer ${
                  !customStartInput || !customEndInput
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-orange-600 hover:bg-orange-700 active:scale-95 shadow-orange-600/10"
                }`}
              >
                Apply Range
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile/Tablet Period Selector */}
      <div className="lg:hidden flex items-center gap-1.5">
        <select
          value={currentPeriod}
          onChange={(e) => {
            if (e.target.value === "custom") {
              setIsCustomOpen(true);
            } else {
              setFilter("period", e.target.value);
            }
          }}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
        >
          {periods.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
          <option value="custom">Custom Timeline...</option>
        </select>
      </div>

      {/* Right: Sync Status & User Profile */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex flex-col text-right">
          <span className="text-[11px] font-medium text-slate-600">{syncStatusText}</span>
          <span className="text-[10px] text-slate-400">PostgreSQL Dual DB</span>
        </div>

        <button
          onClick={handleTriggerSync}
          disabled={isSyncing}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white transition-all shadow-xs cursor-pointer ${
            isSyncing
              ? "bg-orange-400 cursor-not-allowed"
              : "bg-orange-600 hover:bg-orange-700 active:scale-95 shadow-orange-600/10"
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          <span>{isSyncing ? "Syncing..." : "Sync"}</span>
        </button>

        {/* User Pill with Sign Out */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            SA
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-bold text-slate-800 leading-tight">System Administrator</span>
            <span className="text-[10px] text-slate-400 font-medium">admin@truflow.com</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out of dashboard"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
