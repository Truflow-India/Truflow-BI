import React from "react";
import { zohoDb } from "@/lib/database/zoho-db";
import { formatIndianCurrency, formatCount } from "@/lib/formatters";
import { getPeriodRange, PeriodType } from "@/lib/services/date-utils";
import { getEffectiveFilters } from "@/lib/filter-utils";
import { ShoppingCart, Search, ExternalLink } from "lucide-react";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function SalesOrdersPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const effective = await getEffectiveFilters(resolved);
  const periodType = (effective.period as PeriodType) || "this_month";
  const { current } = getPeriodRange(periodType, effective.startDate, effective.endDate);

  const whereClause: any = {
    orderDate: { gte: current.start, lte: current.end },
  };

  if (effective.organizationId) {
    whereClause.organizationId = effective.organizationId;
  }
  if (resolved.search) {
    whereClause.OR = [
      { salesOrderNumber: { contains: resolved.search, mode: "insensitive" } },
      { customerName: { contains: resolved.search, mode: "insensitive" } },
      { referenceNumber: { contains: resolved.search, mode: "insensitive" } },
    ];
  }

  const page = Math.max(1, resolved.page ? parseInt(resolved.page, 10) : 1);
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const [orders, totalCount, allPeriodOrders] = await Promise.all([
    zohoDb.salesOrder.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      orderBy: { orderDate: "desc" },
    }),
    zohoDb.salesOrder.count({ where: whereClause }),
    zohoDb.salesOrder.findMany({
      where: whereClause,
      select: { totalAmount: true, status: true },
    }),
  ]);

  const totalValue = allPeriodOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
  const avgOrderValue = totalCount > 0 ? totalValue / totalCount : 0;
  const approvedOrders = allPeriodOrders.filter((o) => o.status === "approved" || o.status === "open").length;

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-orange-600" />
          Sales Orders Intelligence
        </h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Confirmed Orders</span>
          <div className="text-xl font-black text-slate-900">{formatCount(totalCount)}</div>
          <div className="text-xs text-orange-600 font-bold">{formatIndianCurrency(totalValue)}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Average Order Size</span>
          <div className="text-xl font-black text-orange-600">{formatIndianCurrency(avgOrderValue)}</div>
          <div className="text-xs text-slate-400">per sales order</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active / Open Orders</span>
          <div className="text-xl font-black text-emerald-600">{formatCount(approvedOrders)}</div>
          <div className="text-xs text-slate-400">in fulfillment pipeline</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fulfillment Rate</span>
          <div className="text-xl font-black text-slate-900">
            {totalCount > 0 ? Math.round((approvedOrders / totalCount) * 100) : 0}%
          </div>
          <div className="text-xs text-slate-400">active orders</div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-slate-900">Sales Orders Register</h3>

          <form method="GET" className="relative">
            <input type="hidden" name="period" value={periodType} />
            {effective.organizationId && (
              <input type="hidden" name="organizationId" value={effective.organizationId} />
            )}
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="search"
              defaultValue={resolved.search || ""}
              placeholder="Search order #, customer..."
              className="bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 pl-9 pr-3 py-1.5 rounded-xl text-xs w-56 focus:w-64 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-xs transition-all"
            />
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400">
                <th className="pb-3 pr-4 font-bold uppercase text-[11px]">Order #</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px]">Customer</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px]">Order Date</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px]">Delivery Date</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px]">Sales Rep</th>
                <th className="pb-3 pr-8 pl-4 font-bold uppercase text-[11px] text-right">Value (₹)</th>
                <th className="pb-3 pl-8 pr-4 font-bold uppercase text-[11px]">Status</th>
                <th className="pb-3 pl-4 font-bold uppercase text-[11px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-orange-50/30 transition-colors">
                  <td className="py-3 pr-4 font-bold text-orange-600">{o.salesOrderNumber}</td>
                  <td className="py-3 px-4 font-medium text-slate-800 truncate max-w-[180px]">
                    {o.customerName}
                    {o.isIntercompany && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        IC
                      </span>
                    )}
                    {o.businessType === "Export" && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        Export
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{format(o.orderDate, "yyyy-MM-dd")}</td>
                  <td className="py-3 px-4 text-slate-500">{o.deliveryDate ? format(o.deliveryDate, "yyyy-MM-dd") : "-"}</td>
                  <td className="py-3 px-4 text-slate-700 font-medium">{o.salespersonName || "Direct Sales"}</td>
                  <td className="py-3 pr-8 pl-4 text-right font-bold text-slate-900 whitespace-nowrap">
                    {formatIndianCurrency(o.totalAmount)}
                    {o.currencyCode && o.currencyCode !== "INR" && o.originalAmount && (
                      <div className="text-[10px] text-slate-400 font-normal">
                        ({o.currencyCode} {o.originalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </div>
                    )}
                  </td>
                  <td className="py-3 pl-8 pr-4">
                    <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 whitespace-nowrap">
                      {o.status}
                    </span>
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <a
                      href={`https://books.zoho.com/app/${o.organizationId}#/salesorders/${o.zohoSalesOrderId}`}
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
