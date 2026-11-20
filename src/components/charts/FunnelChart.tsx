"use client";

import React from "react";
import { formatIndianCurrency, formatCount } from "@/lib/formatters";

interface FunnelStep {
  stage: string;
  count: number;
  value?: number;
  percentage: number;
  description?: string;
}

interface FunnelChartProps {
  stages: FunnelStep[];
}

export function FunnelChart({ stages }: FunnelChartProps) {
  if (!stages || stages.length === 0) {
    return <div className="h-48 flex items-center justify-center text-xs text-slate-400">No funnel data available</div>;
  }

  const stageColors = ["#ea580c", "#f97316", "#fb923c", "#059669", "#10b981"];

  return (
    <div className="space-y-3 py-2">
      {stages.map((st, idx) => {
        const color = stageColors[idx % stageColors.length];
        return (
          <div key={st.stage} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-orange-100 text-orange-700">
                  {idx + 1}
                </span>
                <span className="font-bold text-slate-800">{st.stage}</span>
                {st.description && (
                  <span className="hidden md:inline text-[11px] text-slate-500 font-medium">({st.description})</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-900 text-sm">{formatCount(st.count)}</span>
                {st.value !== undefined && (
                  <span className="text-orange-600 font-bold text-xs">{formatIndianCurrency(st.value)}</span>
                )}
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200">
                  {st.percentage}%
                </span>
              </div>
            </div>

            {/* Visual progress bar */}
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(5, st.percentage)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
