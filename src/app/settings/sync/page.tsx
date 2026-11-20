"use client";

import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Database,
  ShieldCheck,
  AlertTriangle,
  Play,
} from "lucide-react";
import { formatCount } from "@/lib/formatters";

export default function SyncStatusPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string>("all");

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/sync/status");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleRunSync = async (moduleName?: string) => {
    setIsSyncing(true);
    try {
      const body: any = { triggerType: "MANUAL" };
      if (moduleName && moduleName !== "all") {
        body.modules = [moduleName];
      }
      await fetch("/api/sync/zoho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await loadStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-24 text-xs font-medium text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-orange-500 mb-2" />
        Loading synchronization telemetry...
      </div>
    );
  }

  const moduleNames = [
    { id: "quotations", title: "Quotations (Estimates)", desc: "Formal sales offers & approval statuses" },
    { id: "salesorders", title: "Sales Orders", desc: "Confirmed bookings & delivery schedules" },
    { id: "invoices", title: "Invoices & Billing", desc: "Accounts receivable & invoice statuses" },
    { id: "payments", title: "Customer Payments", desc: "Deposited payments & payment modes" },
    { id: "customers", title: "Zoho Customers", desc: "Contacts master list & cross-DB mappings" },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Trigger Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <RefreshCw className="w-6 h-6 text-orange-600" />
            Zoho Books Synchronization Telemetry
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status of the incremental background synchronization pipeline and PostgreSQL database health
          </p>
        </div>

        <button
          onClick={() => handleRunSync("all")}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-sm shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-white" : ""}`} />
          <span>{isSyncing ? "Synchronizing All..." : "Run Full Reconciliation"}</span>
        </button>
      </div>

      {/* Database Storage Telemetry */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Synced Quotes</span>
          <div className="text-xl font-bold text-slate-900">{formatCount(data?.counts?.quotations || 0)}</div>
          <div className="text-[10px] text-slate-400">PostgreSQL table</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Synced Orders</span>
          <div className="text-xl font-bold text-slate-900">{formatCount(data?.counts?.salesOrders || 0)}</div>
          <div className="text-[10px] text-slate-400">PostgreSQL table</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Synced Invoices</span>
          <div className="text-xl font-bold text-slate-900">{formatCount(data?.counts?.invoices || 0)}</div>
          <div className="text-[10px] text-slate-400">PostgreSQL table</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Synced Payments</span>
          <div className="text-xl font-bold text-slate-900">{formatCount(data?.counts?.payments || 0)}</div>
          <div className="text-[10px] text-slate-400">PostgreSQL table</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Zoho Customers</span>
          <div className="text-xl font-bold text-slate-900">{formatCount(data?.counts?.customers || 0)}</div>
          <div className="text-[10px] text-slate-400">PostgreSQL table</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cross-DB Links</span>
          <div className="text-xl font-bold text-orange-600">{formatCount(data?.counts?.customerMappings || 0)}</div>
          <div className="text-[10px] text-emerald-600 font-medium">Verified matches</div>
        </div>
      </div>

      {/* Module Health Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Module Synchronization Health</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {moduleNames.map((mod) => {
            const st = data?.modules?.[mod.id] || {};
            const isSuccess = st.status === "SUCCESS";
            return (
              <div key={mod.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3.5 hover:border-orange-200 transition-colors">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{mod.title}</h4>
                    <p className="text-[10px] text-slate-500">{mod.desc}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      isSuccess
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {st.status || "IDLE"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Last Successful</span>
                    <span className="font-semibold text-slate-700">
                      {st.lastSuccessfulSync ? new Date(st.lastSuccessfulSync).toLocaleTimeString() : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Processed Count</span>
                    <span className="font-bold text-orange-600">{st.recordsProcessed || 0}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRunSync(mod.id)}
                  disabled={isSyncing}
                  className="w-full mt-2 py-1.5 rounded-xl text-xs font-medium bg-slate-50 hover:bg-orange-50 hover:text-orange-600 border border-slate-200 hover:border-orange-200 text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3 h-3 text-orange-600" />
                  Sync Module Only
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sync Audit Trail Logs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Recent Synchronization Audit Logs</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                <th className="pb-3">Module</th>
                <th className="pb-3">Organization</th>
                <th className="pb-3">Started At</th>
                <th className="pb-3">Completed At</th>
                <th className="pb-3 text-right">Processed</th>
                <th className="pb-3 text-right">Created</th>
                <th className="pb-3 text-right">Updated</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.recentLogs?.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 font-semibold text-slate-900 capitalize">{log.module}</td>
                  <td className="py-3 text-slate-600">{log.organizationId || "Multi-Org"}</td>
                  <td className="py-3 text-slate-500">{new Date(log.startedAt).toLocaleString()}</td>
                  <td className="py-3 text-slate-500">
                    {log.completedAt ? new Date(log.completedAt).toLocaleTimeString() : "In progress"}
                  </td>
                  <td className="py-3 text-right font-medium text-slate-700">{log.recordsProcessed}</td>
                  <td className="py-3 text-right font-semibold text-emerald-600">{log.recordsCreated}</td>
                  <td className="py-3 text-right font-semibold text-orange-600">{log.recordsUpdated}</td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        log.status === "SUCCESS"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : log.status === "FAILED"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
