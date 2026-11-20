"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface ChartProps {
  data: Array<{
    month: string;
    newCustomers: number;
  }>;
}

function CustomCustomerTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[170px]">
        <div className="font-bold text-slate-800 pb-1.5 mb-1 border-b border-slate-100">
          {d.month}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-xs bg-[#f97316]" />
            New Customers:
          </span>
          <span className="font-bold text-slate-900">{d.newCustomers}</span>
        </div>
      </div>
    );
  }
  return null;
}

export function CustomerAcquisitionChart({ data }: ChartProps) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-xs text-slate-400">No customer acquisition data</div>;
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
          <YAxis stroke="#64748b" fontSize={11} tickLine={false} width={40} />
          <Tooltip content={<CustomCustomerTooltip />} />
          <Bar
            name="New Customers"
            dataKey="newCustomers"
            fill="#f97316"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
