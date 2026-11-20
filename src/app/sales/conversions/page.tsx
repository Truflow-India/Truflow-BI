import React from "react";
import { getConversionAnalytics, ConversionFilterParams } from "@/lib/services/conversion-service";
import { formatIndianCurrency, formatCount } from "@/lib/formatters";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { getEffectiveFilters } from "@/lib/filter-utils";
import {
  GitCommitHorizontal,
  AlertTriangle,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function OrderConversionPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const effective = await getEffectiveFilters(resolved);

  const filterParams: ConversionFilterParams = {
    period: effective.period as any,
    startDate: effective.startDate,
    endDate: effective.endDate,
    organizationId: effective.organizationId,
    salespersonName: resolved.salespersonName,
  };

  const data = await getConversionAnalytics(filterParams);
  const { metrics, funnelStages, lostReasonsBreakdown, lostQuotationsList } = data;

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <GitCommitHorizontal className="w-6 h-6 text-orange-600" />
          Order Conversion & Lost Opportunity Analysis
        </h1>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Quotations</span>
          <div className="text-xl font-black text-slate-900">{formatCount(metrics.totalQuotesCount)}</div>
          <div className="text-xs text-orange-600 font-bold">{formatIndianCurrency(metrics.totalQuotesValue)}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Converted to Orders</span>
          <div className="text-xl font-black text-emerald-600">{formatCount(metrics.convertedQuotesCount)}</div>
          <div className="text-xs text-slate-600 font-semibold">{formatIndianCurrency(metrics.convertedQuotesValue)}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Conversion Rate (Count)</span>
          <div className="text-xl font-black text-orange-600">{metrics.conversionRateCount}%</div>
          <div className="text-xs text-slate-400">of submitted proposals</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Conversion Rate (Value)</span>
          <div className="text-xl font-black text-orange-600">{metrics.conversionRateValue}%</div>
          <div className="text-xs text-slate-400">of total quoted rupees</div>
        </div>
      </div>

      {/* Conversion Funnel & Lost Reasons Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Conversion Funnel */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Full Business Conversion Funnel</h3>
              <p className="text-[11px] text-slate-500 font-medium">Progression from Initial Proposal to Invoiced Revenue</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 font-bold">
              Conversion: {metrics.conversionRateCount}%
            </span>
          </div>

          <FunnelChart stages={funnelStages} />
        </div>

        {/* Lost Reasons Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Lost Reasons Breakdown
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Forensics on declined & expired proposals</p>
          </div>

          <div className="space-y-3 pt-1">
            {lostReasonsBreakdown.length > 0 ? (
              lostReasonsBreakdown.map((r) => (
                <div key={r.reason} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{r.reason}</span>
                    <span className="font-bold text-rose-600">{r.count} deals</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">{formatIndianCurrency(r.value)} lost</div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-xs text-slate-400">
                No explicitly logged lost reasons in this period
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lost Quotations Forensic Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Lost Quotations Forensics</h3>
            <p className="text-xs text-slate-500">Unconverted opportunities identified for post-mortem & reactivation</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold">
            {lostQuotationsList.length} Opportunities Analyzed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400">
                <th className="pb-3 font-bold uppercase text-[11px]">Quotation #</th>
                <th className="pb-3 font-bold uppercase text-[11px]">Customer</th>
                <th className="pb-3 font-bold uppercase text-[11px]">Sales Rep</th>
                <th className="pb-3 font-bold uppercase text-[11px] text-right">Lost Value (₹)</th>
                <th className="pb-3 font-bold uppercase text-[11px]">Lost Date</th>
                <th className="pb-3 font-bold uppercase text-[11px]">Reported Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lostQuotationsList.map((lq) => (
                <tr key={lq.id} className="hover:bg-orange-50/30 transition-colors">
                  <td className="py-3 font-bold text-orange-600">{lq.quotationNumber}</td>
                  <td className="py-3 font-medium text-slate-800 truncate max-w-[200px]">{lq.customerName}</td>
                  <td className="py-3 text-slate-700 font-medium">{lq.salespersonName}</td>
                  <td className="py-3 text-right font-bold text-rose-600">{formatIndianCurrency(lq.quotationValue)}</td>
                  <td className="py-3 text-slate-500">{lq.lostDate}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      {lq.lostReason}
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
