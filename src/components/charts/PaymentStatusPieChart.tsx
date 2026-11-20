"use client";

import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { formatIndianCurrency } from "@/lib/formatters";

interface ChartProps {
  data: Array<{
    status: string;
    count: number;
    value: number;
  }>;
}

const COLORS = ["#ea580c", "#10b981", "#0284c7", "#f59e0b", "#e11d48", "#94a3b8"];

export function PaymentStatusPieChart({ data }: ChartProps) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-xs text-slate-400">No invoice status breakdown</div>;
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "0.75rem",
              fontSize: "12px",
              color: "#0f172a",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)",
            }}
            formatter={(value: any, name: any, item: any) => [
              `${formatIndianCurrency(Number(value))} (${item.payload.count} invoices)`,
              item.payload.status,
            ]}
          />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="status"
            cx="50%"
            cy="45%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
