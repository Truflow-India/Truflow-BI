import React from "react";
import { getFinanceAnalytics, FinanceFilterParams } from "@/lib/services/finance-service";
import { formatIndianCurrency, formatCount } from "@/lib/formatters";
import { getEffectiveFilters } from "@/lib/filter-utils";
import {
  Receipt,
  Clock,
  Search,
  ExternalLink,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function FinanceAnalyticsPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const effective = await getEffectiveFilters(resolved);

  const filterParams: FinanceFilterParams = {
    period: effective.period as any,
    startDate: effective.startDate,
    endDate: effective.endDate,
    organizationId: effective.organizationId,
    status: resolved.status,
    search: resolved.search,
    page: resolved.page ? parseInt(resolved.page, 10) : 1,
    pageSize: resolved.pageSize ? parseInt(resolved.pageSize, 10) : 20,
  };

  const data = await getFinanceAnalytics(filterParams);
  const { kpis, agingBuckets, invoices } = data;

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Receipt className="w-6 h-6 text-orange-600" />
          Finance, Invoices & Receivables
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Revenue recognized, cash collection trends, overdue accounts aging, and accounts receivable ledger
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols- gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Invoices</span>
          <div className="text-xl font-black text-slate-900">{formatCount(kpis.totalInvoices)}</div>
          <div className="text-[11px] text-slate-400">Generated bills</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Invoiced</span>
          <div className="text-xl font-black text-orange-600">{formatIndianCurrency(kpis.totalInvoiceValue)}</div>
          <div className="text-[11px] text-slate-400">Gross revenue</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount Collected</span>
          <div className="text-xl font-black text-emerald-600">{formatIndianCurrency(kpis.amountCollected)}</div>
          <div className="text-[11px] text-emerald-600 font-semibold">Cash received</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Outstanding</span>
          <div className="text-xl font-black text-amber-600">{formatIndianCurrency(kpis.outstandingBalance)}</div>
          <div className="text-[11px] text-slate-400">Unpaid receivables</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overdue Balance</span>
          <div className="text-xl font-black text-rose-600">{formatIndianCurrency(kpis.overdueValue)}</div>
          <div className="text-[11px] text-rose-600 font-semibold">Past due date</div>
        </div>

        {/* <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Average Invoice</span>
          <div className="text-xl font-black text-slate-900">{formatIndianCurrency(kpis.averageInvoiceValue)}</div>
          <div className="text-[11px] text-slate-400">Per transaction</div>
        </div> */}
      </div>

      {/* Receivables Aging Buckets */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-600" />
            Accounts Receivable Aging Analysis
          </h3>
          <p className="text-xs text-slate-500">Risk stratification of pending invoice balances by days elapsed</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {agingBuckets.map((bucket, i) => {
            const isHighRisk = i >= 2;
            return (
              <div
                key={bucket.bucket}
                className={`p-4 rounded-xl border ${
                  isHighRisk
                    ? "bg-rose-50 border-rose-200"
                    : "bg-slate-50 border-slate-200"
                } space-y-1.5`}
              >
                <div className="text-xs font-bold text-slate-600">{bucket.bucket}</div>
                <div
                  className={`text-2xl font-black ${
                    isHighRisk ? "text-rose-600" : "text-slate-900"
                  }`}
                >
                  {formatIndianCurrency(bucket.amount)}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {kpis.outstandingBalance > 0
                    ? `${Math.round((bucket.amount / kpis.outstandingBalance) * 100)}% of total balance`
                    : "0%"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice Register Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-slate-900">Invoice & Collections Ledger</h3>

          <form method="GET" className="relative">
            <input type="hidden" name="period" value={filterParams.period} />
            {filterParams.organizationId && (
              <input type="hidden" name="organizationId" value={filterParams.organizationId} />
            )}
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="search"
              defaultValue={filterParams.search || ""}
              placeholder="Search invoice #, customer..."
              className="bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 pl-9 pr-3 py-1.5 rounded-xl text-xs w-56 focus:w-64 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-xs transition-all"
            />
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400">
                <th className="pb-3 pr-4 font-bold uppercase text-[11px]">Invoice #</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px]">Customer</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px]">Invoice Date</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px]">Due Date</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px] text-right">Total Amount (₹)</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px] text-right">Paid (₹)</th>
                <th className="pb-3 pr-8 pl-4 font-bold uppercase text-[11px] text-right">Balance Due (₹)</th>
                <th className="pb-3 pl-8 pr-4 font-bold uppercase text-[11px]">Status</th>
                <th className="pb-3 pl-4 font-bold uppercase text-[11px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-orange-50/30 transition-colors">
                  <td className="py-3 pr-4 font-bold text-orange-600">{inv.invoiceNumber}</td>
                  <td className="py-3 px-4 font-medium text-slate-800 truncate max-w-[180px]">
                    {inv.customerName}
                    {inv.isIntercompany && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        IC
                      </span>
                    )}
                    {inv.businessType === "Export" && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        Export
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{inv.invoiceDate}</td>
                  <td className="py-3 px-4 text-slate-500">{inv.dueDate}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                    {formatIndianCurrency(inv.totalAmount)}
                    {inv.currencyCode && inv.currencyCode !== "INR" && inv.originalAmount && (
                      <div className="text-[10px] text-slate-400 font-normal">
                        ({inv.currencyCode} {inv.originalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">{formatIndianCurrency(inv.paidAmount)}</td>
                  <td className="py-3 pr-8 pl-4 text-right font-bold text-amber-600 whitespace-nowrap">{formatIndianCurrency(inv.balance)}</td>
                  <td className="py-3 pl-8 pr-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${
                        inv.status === "paid"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : inv.status === "partly_paid" || inv.status === "partially_paid"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : inv.status === "overdue"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <a
                      href={inv.zohoUrl}
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
      </div>
    </div>
  );
}
