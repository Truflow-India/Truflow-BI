"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

interface ChartProps {
  data: Array<{
    period: string;
    completed: number;
    pending: number;
    total: number;
  }>;
}

function CustomVisitTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[170px]">
        <div className="font-bold text-slate-800 pb-1.5 mb-1 border-b border-slate-100">
          {d.period}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-xs bg-[#ea580c]" />
            Completed Visits:
          </span>
          <span className="font-bold text-slate-900">{d.completed}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-xs bg-[#f59e0b]" />
            Pending / Follow-up:
          </span>
          <span className="font-bold text-slate-900">{d.pending}</span>
        </div>
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <span className="text-slate-500 font-semibold">Total Visits:</span>
          <span className="font-black text-slate-900">{d.total}</span>
        </div>
      </div>
    );
  }
  return null;
}

export function VisitActivityChart({ data }: ChartProps) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-xs text-slate-400">No visit activity data</div>;
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} />
          <YAxis stroke="#64748b" fontSize={11} tickLine={false} width={40} />
          <Tooltip content={<CustomVisitTooltip />} />
          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
          <Bar
            name="Completed Visits"
            dataKey="completed"
            fill="#ea580c"
            stackId="a"
            radius={[0, 0, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            name="Pending / Cold Visits"
            dataKey="pending"
            fill="#f59e0b"
            stackId="a"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
