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

interface MonthlyTrendItem {
  monthIndex: number;
  monthName: string;
  target: number;
  achieved: number;
  truflowAchieved?: number;
  zeetorkAchieved?: number;
  quotationCount: number;
  completionRate: number;
}

interface TargetVsAchievedChartProps {
  data: MonthlyTrendItem[];
  title?: string;
  showCompanySplit?: boolean;
}

export function TargetVsAchievedChart({
  data,
  title,
  showCompanySplit = false,
}: TargetVsAchievedChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No monthly target data available
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          {title}
        </h4>
      )}
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="monthName"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              tickFormatter={(v) => {
                if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
                if (v >= 100000) return `₹${(v / 100000).toFixed(0)}L`;
                if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
                return `₹${v}`;
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "0.75rem",
                fontSize: "12px",
                color: "#0f172a",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)",
              }}
              formatter={(value: any, name: any) => {
                const num = Number(value);
                if (name === "Target" || name === "Achieved" || name === "TruFlow Achieved" || name === "Zeetork Achieved") {
                  return [formatIndianCurrency(num), name];
                }
                return [value, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />

            <Bar
              yAxisId="left"
              name="Target"
              dataKey="target"
              fill="#cbd5e1"
              radius={[4, 4, 0, 0]}
              maxBarSize={showCompanySplit ? 18 : 28}
            />

            {showCompanySplit ? (
              <>
                <Bar
                  yAxisId="left"
                  name="TruFlow Achieved"
                  dataKey="truflowAchieved"
                  fill="#ea580c"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                />
                <Bar
                  yAxisId="left"
                  name="Zeetork Achieved"
                  dataKey="zeetorkAchieved"
                  fill="#0284c7"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                />
              </>
            ) : (
              <Bar
                yAxisId="left"
                name="Achieved"
                dataKey="achieved"
                fill="#ea580c"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

