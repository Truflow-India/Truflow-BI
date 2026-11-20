"use client";

import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { formatIndianCurrency } from "@/lib/formatters";

interface ChartProps {
  data: Array<{
    period: string;
    quotations: number;
    converted: number;
    quotationValue: number;
    domesticValue?: number;
    exportValue?: number;
    domesticQuotes?: number;
    exportQuotes?: number;
    icValue?: number;
    icCount?: number;
  }>;
  organizationId?: string;
}

function getICTarget(orgId?: string) {
  if (orgId === "771755208") return "ZT";
  if (orgId === "876204905") return "TF";
  return "ZT/TF";
}

function CustomQuotationTooltip({ active, payload, organizationId }: any) {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    const icTarget = getICTarget(organizationId);
    const domesticVal = d.domesticValue ?? d.quotationValue;
    const exportVal = d.exportValue ?? 0;
    const icVal = d.icValue ?? 0;

    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[210px]">
        <div className="font-bold text-slate-800 pb-1.5 mb-1 border-b border-slate-100 flex items-center justify-between">
          <span>{d.period}</span>
          <span className="text-[10px] font-normal text-slate-400">Quotes & Values</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-xs bg-[#ea580c]" />
            Quotes Created:
          </span>
          <span className="font-bold text-slate-900">
            {d.quotations} {d.exportQuotes ? `(${d.domesticQuotes ?? 0} Dom / ${d.exportQuotes} Exp)` : ""}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-xs bg-[#0284c7]" />
            Domestic Value:
          </span>
          <span className="font-bold text-sky-700">{formatIndianCurrency(domesticVal)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-xs bg-[#8b5cf6]" />
            Export Value:
          </span>
          <span className="font-bold text-purple-700">{formatIndianCurrency(exportVal)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-xs bg-[#10b981]" />
            Converted:
          </span>
          <span className="font-bold text-emerald-700">{d.converted}</span>
        </div>
        {icVal > 0 && (
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-amber-100 text-amber-800 bg-amber-50/60 px-2 py-1 rounded-md mt-1">
            <span className="font-semibold text-[11px]">IC Quote {icTarget}:</span>
            <span className="font-bold text-[11px]">{formatIndianCurrency(icVal)}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
}

export function QuotationVsConvertedChart({ data, organizationId }: ChartProps) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-xs text-slate-400">No quotation data for period</div>;
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="period"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
          />
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
          <Tooltip content={<CustomQuotationTooltip organizationId={organizationId} />} />
          <Legend
            wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
          />
          <Bar
            name="Quotations Created"
            dataKey="quotations"
            fill="#ea580c"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
          <Bar
            name="Orders Converted"
            dataKey="converted"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
          <Line
            name="Domestic Quoted (₹)"
            type="monotone"
            dataKey="domesticValue"
            stroke="#0284c7"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#0284c7" }}
          />
          <Line
            name="Export Quoted (₹)"
            type="monotone"
            dataKey="exportValue"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 3, fill: "#8b5cf6" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
