import React from "react";
import { getCustomerAnalytics, CustomerFilterParams } from "@/lib/services/customer-service";
import { formatIndianCurrency, formatCount } from "@/lib/formatters";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { getEffectiveFilters } from "@/lib/filter-utils";
import {
  Users,
  Search,
  MapPin,
  CheckCircle,
  Calendar,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function CustomerAnalyticsPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const effective = await getEffectiveFilters(resolved);

  const filterParams: CustomerFilterParams = {
    period: effective.period as any,
    startDate: effective.startDate,
    endDate: effective.endDate,
    organizationId: effective.organizationId,
    search: resolved.search,
    page: resolved.page ? parseInt(resolved.page, 10) : 1,
    pageSize: resolved.pageSize ? parseInt(resolved.pageSize, 10) : 25,
  };

  const data = await getCustomerAnalytics(filterParams);
  const { kpis, acquisitionFunnel, topCustomersByQuotation, topCustomersByInvoice, customers, pagination, periodRange } = data;

  return (
    <div className="space-y-8">
      {/* Title & Scope Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-orange-600" />
            Customer Intelligence & Acquisition Funnel
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Customer master records correlated with sales activity, lifetime value, and field visit touchpoints
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200/80 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-orange-600" />
            {periodRange.isAllTime ? "All Time Records" : `${periodRange.start} - ${periodRange.end}`}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Customers</span>
          <div className="text-xl font-black text-slate-900">{formatCount(kpis.totalCustomers)}</div>
          <div className="text-[11px] text-slate-400">Database master</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">New Acquired</span>
          <div className="text-xl font-black text-orange-600">{formatCount(kpis.newCustomersInPeriod)}</div>
          <div className="text-[11px] text-slate-400">In selected period</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">With Quotations</span>
          <div className="text-xl font-black text-slate-900">{formatCount(kpis.customersWithQuotations)}</div>
          <div className="text-[11px] text-slate-500 font-medium">
            {kpis.totalCustomers > 0 ? `${Math.round((kpis.customersWithQuotations / kpis.totalCustomers) * 100)}%` : "0%"} in period
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">With Sales Orders</span>
          <div className="text-xl font-black text-purple-600">{formatCount(kpis.customersWithOrders)}</div>
          <div className="text-[11px] text-slate-400">
            {kpis.totalCustomers > 0 ? `${Math.round((kpis.customersWithOrders / kpis.totalCustomers) * 100)}%` : "0%"} converted
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Invoiced Clients</span>
          <div className="text-xl font-black text-emerald-600">{formatCount(kpis.customersWithInvoices)}</div>
          <div className="text-[11px] text-slate-400">
            {kpis.totalCustomers > 0 ? `${Math.round((kpis.customersWithInvoices / kpis.totalCustomers) * 100)}%` : "0%"} billed
          </div>
        </div>
      </div>

      {/* Funnel & Top Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Acquisition Funnel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Customer Progression Funnel</h3>
            <p className="text-[11px] text-slate-500 font-medium">New Account → Proposal → Booking → Billing in period</p>
          </div>
          <FunnelChart stages={acquisitionFunnel} />
        </div>

        {/* Top Customers by Quotations */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Top Customers by Quoted Value</h3>
            <p className="text-[11px] text-slate-500 font-medium">Highest proposed pipeline value in period</p>
          </div>
          <div className="space-y-2.5">
            {topCustomersByQuotation.length > 0 ? (
              topCustomersByQuotation.slice(0, 5).map((c) => (
                <div key={c.customerId} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-orange-50/20 transition-colors">
                  <div className="truncate max-w-[170px]">
                    <span className="text-xs font-bold text-slate-800 block truncate">{c.customerName}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{c.count} proposals</span>
                  </div>
                  <div className="text-xs font-bold text-orange-600">{formatIndianCurrency(c.value)}</div>
                </div>
              ))
            ) : (
              <div className="h-44 flex items-center justify-center text-xs text-slate-400">
                No quotations recorded in this period
              </div>
            )}
          </div>
        </div>

        {/* Top Customers by Invoiced Revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Top Customers by Invoiced Revenue</h3>
            <p className="text-[11px] text-slate-500 font-medium">Highest recognized billing value in period</p>
          </div>
          <div className="space-y-2.5">
            {topCustomersByInvoice.length > 0 ? (
              topCustomersByInvoice.slice(0, 5).map((c) => (
                <div key={c.customerId} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-orange-50/20 transition-colors">
                  <div className="truncate max-w-[170px]">
                    <span className="text-xs font-bold text-slate-800 block truncate">{c.customerName}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{c.count} invoices</span>
                  </div>
                  <div className="text-xs font-bold text-emerald-600">{formatIndianCurrency(c.value)}</div>
                </div>
              ))
            ) : (
              <div className="h-44 flex items-center justify-center text-xs text-slate-400">
                No invoices recorded in this period
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Correlated Customer Register Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Correlated Customer Master Ledger</h3>
            <p className="text-xs text-slate-500">
              Unified accounts showing quotes & revenue generated in the selected period alongside Visit DB field touchpoints
            </p>
          </div>

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
              placeholder="Search customer, company..."
              className="bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 pl-9 pr-3 py-1.5 rounded-xl text-xs w-56 focus:w-64 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-xs transition-all"
            />
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400">
                <th className="pb-3 font-bold uppercase text-[11px]">Customer Name</th>
                <th className="pb-3 font-bold uppercase text-[11px]">Acquired Date</th>
                <th className="pb-3 font-bold uppercase text-[11px] text-right">Quotes</th>
                <th className="pb-3 pr-6 pl-4 font-bold uppercase text-[11px] text-right">Quoted (₹)</th>
                <th className="pb-3 pr-6 pl-4 font-bold uppercase text-[11px] text-right">Invoiced (₹)</th>
                <th className="pb-3 pr-6 pl-4 font-bold uppercase text-[11px] text-right">Balance (₹)</th>
                <th className="pb-3 font-bold uppercase text-[11px]">Last Field Visit (Visit DB)</th>
                <th className="pb-3 font-bold uppercase text-[11px] text-center">Cross-DB Match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-orange-50/30 transition-colors">
                  <td className="py-3 font-bold text-slate-900 truncate max-w-[200px]">{c.customerName}</td>
                  <td className="py-3 text-slate-500">{c.createdDate}</td>
                  <td className="py-3 text-right text-slate-600 font-medium">{c.quotationCount}</td>
                  <td className="py-3 pr-6 pl-4 text-right font-bold text-orange-600 whitespace-nowrap">{formatIndianCurrency(c.quotationValue)}</td>
                  <td className="py-3 pr-6 pl-4 text-right font-bold text-emerald-600 whitespace-nowrap">{formatIndianCurrency(c.invoiceValue)}</td>
                  <td className="py-3 pr-6 pl-4 text-right font-bold text-amber-600 whitespace-nowrap">{formatIndianCurrency(c.outstandingBalance)}</td>
                  <td className="py-3 text-slate-700 font-medium">
                    {c.lastVisitDate !== "-" ? (
                      <span className="flex items-center gap-1.5 text-orange-600 font-semibold">
                        <MapPin className="w-3.5 h-3.5" />
                        {c.lastVisitDate}
                      </span>
                    ) : (
                      <span className="text-slate-400">No field visit logged</span>
                    )}
                  </td>
                  <td className="py-3 text-center">
                    {c.isMappedToVisitDB ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Direct Zoho</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500">
          <div>
            Showing <span className="text-slate-900 font-bold">{customers.length}</span> of{" "}
            <span className="text-slate-900 font-bold">{pagination.totalCount}</span> customers
          </div>

          <div className="flex items-center gap-2">
            {pagination.page > 1 && (
              <Link
                href={`/customers?period=${filterParams.period}&page=${pagination.page - 1}${filterParams.organizationId ? `&organizationId=${filterParams.organizationId}` : ""}${filterParams.startDate ? `&startDate=${filterParams.startDate}` : ""}${filterParams.endDate ? `&endDate=${filterParams.endDate}` : ""}${filterParams.search ? `&search=${encodeURIComponent(filterParams.search)}` : ""}`}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Previous
              </Link>
            )}
            <span className="px-2 font-medium">
              Page {pagination.page} of {Math.max(1, pagination.totalPages)}
            </span>
            {pagination.page < pagination.totalPages && (
              <Link
                href={`/customers?period=${filterParams.period}&page=${pagination.page + 1}${filterParams.organizationId ? `&organizationId=${filterParams.organizationId}` : ""}${filterParams.startDate ? `&startDate=${filterParams.startDate}` : ""}${filterParams.endDate ? `&endDate=${filterParams.endDate}` : ""}${filterParams.search ? `&search=${encodeURIComponent(filterParams.search)}` : ""}`}
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
