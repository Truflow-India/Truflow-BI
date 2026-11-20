import React from "react";
import { MetricDelta } from "@/lib/services/date-utils";
import { formatIndianCurrency, formatCount } from "@/lib/formatters";

export interface KpiCardProps {
  title: string;
  value: number;
  isCurrency?: boolean;
  delta?: MetricDelta;
  icon: React.ElementType;
  accentColor?: "indigo" | "cyan" | "emerald" | "amber" | "rose" | "purple" | "orange";
  periodLabel?: string;
  formatter?: (val: number) => string;
  breakdown?: {
    domestic?: string;
    export?: string;
    ic?: string;
    icLabel?: string;
  };
}

export function KpiCard({
  title,
  value,
  isCurrency = false,
  icon: Icon,
  accentColor = "orange",
  formatter,
  breakdown,
}: KpiCardProps) {
  const displayValue = formatter
    ? formatter(value)
    : isCurrency
    ? formatIndianCurrency(value)
    : formatCount(value);

  const colorVariants: Record<string, { iconBg: string }> = {
    orange: {
      iconBg: "bg-orange-50 border-orange-200/70 text-orange-600",
    },
    indigo: {
      iconBg: "bg-indigo-50 border-indigo-200/70 text-indigo-600",
    },
    cyan: {
      iconBg: "bg-sky-50 border-sky-200/70 text-sky-600",
    },
    emerald: {
      iconBg: "bg-emerald-50 border-emerald-200/70 text-emerald-600",
    },
    amber: {
      iconBg: "bg-amber-50 border-amber-200/70 text-amber-600",
    },
    rose: {
      iconBg: "bg-rose-50 border-rose-200/70 text-rose-600",
    },
    purple: {
      iconBg: "bg-purple-50 border-purple-200/70 text-purple-600",
    },
  };

  const scheme = colorVariants[accentColor] || colorVariants.orange;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-orange-300 transition-all group">
      {/* Top row: Title and Icon */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${scheme.iconBg}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>

        {/* Metric Value */}
        <div className="mt-2.5">
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 group-hover:text-orange-600 transition-colors">
            {displayValue}
          </h3>
        </div>
      </div>

      {/* Breakdown Strip (Domestic vs Export & IC) */}
      {breakdown && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1 text-[11px]">
          {(breakdown.domestic || breakdown.export) && (
            <div className="flex items-center justify-between text-slate-500 font-medium text-[10px] sm:text-[11px]">
              {breakdown.domestic && (
                <span>
                  Dom: <strong className="text-slate-800 font-bold">{breakdown.domestic}</strong>
                </span>
              )}
              {breakdown.export && (
                <span className="text-purple-700">
                  Exp: <strong className="text-purple-800 font-bold">{breakdown.export}</strong>
                </span>
              )}
            </div>
          )}
          {breakdown.ic && (
            <div className="flex items-center justify-between bg-amber-50/90 text-amber-900 border border-amber-200/70 px-1.5 py-0.5 rounded text-[10px] font-semibold">
              <span>{breakdown.icLabel || "IC"}:</span>
              <span className="font-bold">{breakdown.ic}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
