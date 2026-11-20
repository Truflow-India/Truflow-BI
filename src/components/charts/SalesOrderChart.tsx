"use client";

import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { formatIndianCurrency } from "@/lib/formatters";

interface ChartProps {
  data: Array<{
    month: string;
    orders: number;
    value: number;
    domesticValue?: number;
    exportValue?: number;
    domesticOrders?: number;
    exportOrders?: number;
    icValue?: number;
    icOrders?: number;
    closedOrders?: number;
  }>;
  organizationId?: string;
}

function getICTarget(orgId?: string) {
  if (orgId === "771755208") return "ZT";
  if (orgId === "876204905") return "TF";
  return "ZT/TF";
}

function CustomOrderTooltip({ active, payload, organizationId }: any) {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    const icTarget = getICTarget(organizationId);
    const domesticVal = d.domesticValue ?? d.value;
    const exportVal = d.exportValue ?? 0;
    const icVal = d.icValue ?? 0;

    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[210px]">
        <div className="font-bold text-slate-800 pb-1.5 mb-1 border-b border-slate-100 flex items-center justify-between">
          <span>{d.month}</span>
          <span className="text-[10px] font-normal text-slate-400">Order Trajectory</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-xs bg-[#7c3aed]" />
            No. of Orders:
          </span>
          <span className="font-bold text-slate-900">
            {d.orders} {d.exportOrders ? `(${d.domesticOrders ?? 0} Dom / ${d.exportOrders} Exp)` : ""}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-xs bg-[#ea580c]" />
            Domestic Order Value:
          </span>
          <span className="font-bold text-orange-600">{formatIndianCurrency(domesticVal)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-xs bg-[#8b5cf6]" />
            Export Order Value:
          </span>
          <span className="font-bold text-purple-700">{formatIndianCurrency(exportVal)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-xs bg-slate-500" />
            Total Order Value:
          </span>
          <span className="font-bold text-slate-900">{formatIndianCurrency(d.value)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-xs bg-[#10b981]" />
            Closed Orders:
          </span>
          <span className="font-bold text-emerald-700">{d.closedOrders ?? 0}</span>
        </div>
        {icVal > 0 && (
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-amber-100 text-amber-800 bg-amber-50/60 px-2 py-1 rounded-md mt-1">
            <span className="font-semibold text-[11px]">IC Order {icTarget}:</span>
            <span className="font-bold text-[11px]">{formatIndianCurrency(icVal)}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
}

export function SalesOrderChart({ data, organizationId }: ChartProps) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-xs text-slate-400">No order data available</div>;
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 15, bottom: 0 }}>
          <defs>
            <linearGradient id="domOrderGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="expOrderGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
          <YAxis
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            width={65}
            tickFormatter={(val) => {
              if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
              if (val >= 100000) return `₹${(val / 100000).toFixed(0)}L`;
              if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
              return val.toString();
            }}
          />
          <Tooltip content={<CustomOrderTooltip organizationId={organizationId} />} />
          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
          <Area
            type="monotone"
            name="Domestic Order Value (₹)"
            dataKey="domesticValue"
            stroke="#ea580c"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#domOrderGrad)"
          />
          <Area
            type="monotone"
            name="Export Order Value (₹)"
            dataKey="exportValue"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeDasharray="4 4"
            fillOpacity={1}
            fill="url(#expOrderGrad)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
