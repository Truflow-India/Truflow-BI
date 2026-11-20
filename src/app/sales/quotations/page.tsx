import React from "react";
import { getQuotationAnalytics, QuotationFilterParams } from "@/lib/services/quotation-service";
import { formatIndianCurrency, formatCount } from "@/lib/formatters";
import { SelectFilter } from "@/components/ui/select-filter";
import { getEffectiveFilters } from "@/lib/filter-utils";
import {
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Search,
  Filter,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function QuotationAnalyticsPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const effective = await getEffectiveFilters(resolved);

  const filterParams: QuotationFilterParams = {
    period: effective.period as any,
    startDate: effective.startDate,
    endDate: effective.endDate,
    organizationId: effective.organizationId,
    status: resolved.status,
    salespersonName: resolved.salespersonName,
    customerId: resolved.customerId,
    search: resolved.search,
    page: resolved.page ? parseInt(resolved.page) : 1,
    pageSize: 20,
    sortBy: resolved.sortBy || "quotationDate",
    sortOrder: (resolved.sortOrder as any) || "desc",
  };

  const data = await getQuotationAnalytics(filterParams);
  const { kpis, statusDistribution, salespersonPerformance, quotations, pagination } = data;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-orange-600" />
            Quotation Analytics & Performance
          </h1>

        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Quotations</span>
          <div className="text-xl font-black text-slate-900">{formatCount(kpis.totalQuotations)}</div>
          <div className="text-[11px] text-orange-600 font-bold">{formatIndianCurrency(kpis.totalQuotationValue)}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Converted to Orders</span>
          <div className="text-xl font-black text-emerald-600">{formatCount(kpis.convertedQuotations)}</div>
          <div className="text-[11px] text-slate-600 font-semibold">{formatIndianCurrency(kpis.convertedValue)}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Conversion Rate</span>
          <div className="text-xl font-black text-orange-600">{kpis.conversionPercentage}%</div>
          <div className="text-[11px] text-slate-400">by quote count</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Approved / Sent</span>
          <div className="text-xl font-black text-sky-600">{formatCount(kpis.approvedQuotations)}</div>
          <div className="text-[11px] text-slate-400">Ready for order</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lost / Declined</span>
          <div className="text-xl font-black text-rose-600">{formatCount(kpis.lostQuotations)}</div>
          <div className="text-[11px] text-slate-400">{formatIndianCurrency(kpis.lostValue)}</div>
        </div>
      </div>

      {/* Charts & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Quotation Status Breakdown</h3>
          <div className="space-y-2 pt-2">
            {statusDistribution.map((st) => (
              <div key={st.status} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-orange-50/20 transition-colors">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="font-semibold text-slate-800">{st.status}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="font-bold text-slate-900">{st.count} quotes</span>
                  <span className="text-orange-600 font-bold">{formatIndianCurrency(st.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion by Salesperson */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Salesperson Quotation Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400">
                  <th className="pb-2 font-bold uppercase text-[11px]">Sales Rep</th>
                  <th className="pb-2 font-bold uppercase text-[11px] text-right">Quotes</th>
                  <th className="pb-2 font-bold uppercase text-[11px] text-right">Total (₹)</th>
                  <th className="pb-2 font-bold uppercase text-[11px] text-right">Converted</th>
                  <th className="pb-2 font-bold uppercase text-[11px] text-right">Conv %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salespersonPerformance.slice(0, 7).map((sp) => (
                  <tr key={sp.rep} className="hover:bg-orange-50/30 transition-colors">
                    <td className="py-2.5 font-bold text-slate-900">{sp.rep}</td>
                    <td className="py-2.5 text-right text-slate-600 font-medium">{sp.totalQuotes}</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">{formatIndianCurrency(sp.totalValue)}</td>
                    <td className="py-2.5 text-right font-bold text-emerald-600">{sp.convertedQuotes}</td>
                    <td className="py-2.5 text-right font-bold text-orange-600">{sp.conversionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quotation Table with Search & Status Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-slate-900">Quotation Ledger</h3>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Form */}
            <form method="GET" className="relative">
              <input type="hidden" name="period" value={filterParams.period} />
              {filterParams.organizationId && (
                <input type="hidden" name="organizationId" value={filterParams.organizationId} />
              )}
              {filterParams.status && (
                <input type="hidden" name="status" value={filterParams.status} />
              )}
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                name="search"
                defaultValue={filterParams.search || ""}
                placeholder="Search quote #, customer..."
                className="bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 pl-9 pr-3 py-1.5 rounded-xl text-xs w-48 focus:w-64 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-xs transition-all"
              />
            </form>

            {/* Status Filter */}
            <SelectFilter
              name="status"
              defaultValue={filterParams.status || "ALL"}
              options={[
                { value: "ALL", label: "All Statuses" },
                { value: "approved", label: "Approved" },
                { value: "invoiced", label: "Invoiced" },
                { value: "pending_approval", label: "Pending Approval" },
                { value: "declined", label: "Declined / Lost" },
                { value: "draft", label: "Draft" },
              ]}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400">
                <th className="pb-3 pr-4 font-bold uppercase text-[11px]">Quotation #</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px]">Customer</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px]">Date</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px]">Expiry</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px]">Sales Rep</th>
                <th className="pb-3 pr-8 pl-4 font-bold uppercase text-[11px] text-right">Value (₹)</th>
                <th className="pb-3 pl-8 pr-4 font-bold uppercase text-[11px]">Status</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px]">Order Ref</th>
                <th className="pb-3 pl-4 font-bold uppercase text-[11px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotations.map((q) => (
                <tr key={q.id} className="hover:bg-orange-50/30 transition-colors">
                  <td className="py-3 pr-4 font-bold text-orange-600">{q.quotationNumber}</td>
                  <td className="py-3 px-4 font-medium text-slate-800 truncate max-w-[180px]">
                    {q.customerName}
                    {q.isIntercompany && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        IC
                      </span>
                    )}
                    {q.businessType === "Export" && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        Export
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{q.quotationDate}</td>
                  <td className="py-3 px-4 text-slate-500">{q.expiryDate}</td>
                  <td className="py-3 px-4 text-slate-700 font-medium">{q.salespersonName}</td>
                  <td className="py-3 pr-8 pl-4 text-right font-bold text-slate-900 whitespace-nowrap">
                    {formatIndianCurrency(q.totalAmount)}
                    {q.currencyCode && q.currencyCode !== "INR" && q.originalAmount && (
                      <div className="text-[10px] text-slate-400 font-normal">
                        ({q.currencyCode} {q.originalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </div>
                    )}
                  </td>
                  <td className="py-3 pl-8 pr-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${
                        q.isConverted
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : q.isLost
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : q.status === "approved"
                          ? "bg-orange-50 text-orange-700 border border-orange-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {q.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">{q.convertedSalesOrderNumber || "-"}</td>
                  <td className="py-3 pl-4 text-right">
                    <a
                      href={q.zohoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-orange-600 hover:text-orange-700 font-semibold"
                    >
                      Zoho <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500">
          <div>
            Showing <span className="text-slate-900 font-bold">{quotations.length}</span> of{" "}
            <span className="text-slate-900 font-bold">{pagination.totalCount}</span> quotations
          </div>

          <div className="flex items-center gap-2">
            {pagination.page > 1 && (
              <Link
                href={`/sales/quotations?period=${filterParams.period}&page=${pagination.page - 1}${filterParams.organizationId ? `&organizationId=${filterParams.organizationId}` : ""}${filterParams.status ? `&status=${filterParams.status}` : ""}${filterParams.startDate ? `&startDate=${filterParams.startDate}` : ""}${filterParams.endDate ? `&endDate=${filterParams.endDate}` : ""}${filterParams.salespersonName ? `&salespersonName=${encodeURIComponent(filterParams.salespersonName)}` : ""}${filterParams.search ? `&search=${encodeURIComponent(filterParams.search)}` : ""}`}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Previous
              </Link>
            )}
            <span className="px-2 font-medium">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            {pagination.page < pagination.totalPages && (
              <Link
                href={`/sales/quotations?period=${filterParams.period}&page=${pagination.page + 1}${filterParams.organizationId ? `&organizationId=${filterParams.organizationId}` : ""}${filterParams.status ? `&status=${filterParams.status}` : ""}${filterParams.startDate ? `&startDate=${filterParams.startDate}` : ""}${filterParams.endDate ? `&endDate=${filterParams.endDate}` : ""}${filterParams.salespersonName ? `&salespersonName=${encodeURIComponent(filterParams.salespersonName)}` : ""}${filterParams.search ? `&search=${encodeURIComponent(filterParams.search)}` : ""}`}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
