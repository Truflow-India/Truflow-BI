import React from "react";
import { getOverviewData, OverviewFilterParams } from "@/lib/services/overview-service";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatIndianCurrency } from "@/lib/formatters";
import { QuotationVsConvertedChart } from "@/components/charts/QuotationVsConvertedChart";
import { MonthlyInvoiceChart } from "@/components/charts/MonthlyInvoiceChart";
import { SalesOrderChart } from "@/components/charts/SalesOrderChart";
import { CustomerAcquisitionChart } from "@/components/charts/CustomerAcquisitionChart";
import { VisitActivityChart } from "@/components/charts/VisitActivityChart";
import {
  FileSpreadsheet,
  CheckCircle2,
  ShoppingCart,
  Receipt,
  CreditCard,
  UserPlus,
  MapPin,
  TrendingUp,
  ArrowUpRight,
  Calendar,
  Globe,
  ArrowLeftRight,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { getEffectiveFilters } from "@/lib/filter-utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function OverviewPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const effective = await getEffectiveFilters(resolvedParams);

  const filterParams: OverviewFilterParams = {
    period: effective.period as any,
    startDate: effective.startDate,
    endDate: effective.endDate,
    organizationId: effective.organizationId,
    salespersonName: resolvedParams.salespersonName,
    customerId: resolvedParams.customerId,
    status: resolvedParams.status,
    granularity: (resolvedParams.granularity as any) || undefined,
  };

  const data = await getOverviewData(filterParams);
  const { kpis, charts, period, granularity, recentActivities, breakdown } = data;

  const buildGranularityHref = (targetGranularity: "monthly" | "weekly") => {
    const params = new URLSearchParams();
    if (filterParams.period) params.set("period", filterParams.period);
    if (filterParams.startDate) params.set("startDate", filterParams.startDate);
    if (filterParams.endDate) params.set("endDate", filterParams.endDate);
    if (filterParams.organizationId) params.set("organizationId", filterParams.organizationId);
    params.set("granularity", targetGranularity);
    return `/?${params.toString()}`;
  };

  return (
    <div className="space-y-8">
      {/* Page Title & Scope Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Executive Performance Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Consolidated intelligence across Zoho Books and Visit Management •{" "}
            <span className="text-orange-600 font-semibold bg-orange-50 px-2 py-0.5 rounded border border-orange-200/60">
              {format(period.current.start, "MMM dd, yyyy")} - {format(period.current.end, "MMM dd, yyyy")}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/reports?period=${filterParams.period}${filterParams.organizationId ? `&organizationId=${filterParams.organizationId}` : ""}${filterParams.startDate ? `&startDate=${filterParams.startDate}` : ""}${filterParams.endDate ? `&endDate=${filterParams.endDate}` : ""}`}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition-all flex items-center gap-1.5"
          >
            Generate Briefing Report
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 10 Core KPI Cards Grid (5 per row on desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Total Quotations"
          value={kpis.totalQuotations.current}
          icon={FileSpreadsheet}
          accentColor="orange"
          breakdown={{
            domestic: `${breakdown.quotations.domesticCount}`,
            export: `${breakdown.quotations.exportCount}`,
            ic: breakdown.quotations.icCount > 0 ? `${breakdown.quotations.icCount} quotes` : undefined,
            icLabel: `IC ${breakdown.targetSiblingShort}`,
          }}
        />
        <KpiCard
          title="Total Quotation Value"
          value={kpis.totalQuotationValue.current}
          isCurrency={true}
          icon={TrendingUp}
          accentColor="orange"
          breakdown={{
            domestic: formatIndianCurrency(breakdown.quotations.domesticValue),
            export: formatIndianCurrency(breakdown.quotations.exportValue),
            ic: breakdown.quotations.icValue > 0 ? formatIndianCurrency(breakdown.quotations.icValue) : undefined,
            icLabel: `IC ${breakdown.targetSiblingShort}`,
          }}
        />
        <KpiCard
          title="Orders Converted"
          value={kpis.ordersConverted.current}
          icon={CheckCircle2}
          accentColor="emerald"
        />
        <KpiCard
          title="Sales Orders Created"
          value={kpis.totalSalesOrders.current}
          icon={ShoppingCart}
          accentColor="purple"
          breakdown={{
            domestic: `${breakdown.orders.domesticCount}`,
            export: `${breakdown.orders.exportCount}`,
            ic: breakdown.orders.icCount > 0 ? `${breakdown.orders.icCount} orders` : undefined,
            icLabel: `IC ${breakdown.targetSiblingShort}`,
          }}
        />
        <KpiCard
          title="Sales Order Value"
          value={kpis.totalSalesOrderValue.current}
          isCurrency={true}
          icon={ShoppingCart}
          accentColor="purple"
          breakdown={{
            domestic: formatIndianCurrency(breakdown.orders.domesticValue),
            export: formatIndianCurrency(breakdown.orders.exportValue),
            ic: breakdown.orders.icValue > 0 ? formatIndianCurrency(breakdown.orders.icValue) : undefined,
            icLabel: `IC ${breakdown.targetSiblingShort}`,
          }}
        />
        <KpiCard
          title="Invoices Generated"
          value={kpis.totalInvoices.current}
          icon={Receipt}
          accentColor="cyan"
          breakdown={{
            domestic: `${breakdown.invoices.domesticCount}`,
            export: `${breakdown.invoices.exportCount}`,
            ic: breakdown.invoices.icCount > 0 ? `${breakdown.invoices.icCount} bills` : undefined,
            icLabel: `IC ${breakdown.targetSiblingShort}`,
          }}
        />
        <KpiCard
          title="Total Invoiced Value"
          value={kpis.totalInvoiceValue.current}
          isCurrency={true}
          icon={Receipt}
          accentColor="cyan"
          breakdown={{
            domestic: formatIndianCurrency(breakdown.invoices.domesticValue),
            export: formatIndianCurrency(breakdown.invoices.exportValue),
            ic: breakdown.invoices.icValue > 0 ? formatIndianCurrency(breakdown.invoices.icValue) : undefined,
            icLabel: `IC ${breakdown.targetSiblingShort}`,
          }}
        />
        <KpiCard
          title="Amount Collected"
          value={kpis.amountCollected.current}
          isCurrency={true}
          icon={CreditCard}
          accentColor="emerald"
          breakdown={{
            domestic: formatIndianCurrency(breakdown.collections.domesticCollected),
            export: formatIndianCurrency(breakdown.collections.exportCollected),
            ic: breakdown.collections.icCollected > 0 ? formatIndianCurrency(breakdown.collections.icCollected) : undefined,
            icLabel: `IC ${breakdown.targetSiblingShort}`,
          }}
        />
        <KpiCard
          title="New Customers"
          value={kpis.newCustomers.current}
          icon={UserPlus}
          accentColor="amber"
        />
        <KpiCard
          title="Customer Visits"
          value={kpis.totalCustomerVisits.current}
          icon={MapPin}
          accentColor="orange"
        />
      </div>

      {/* Executive Segment Intelligence: Export Portfolio & Intercompany Trade */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-white to-purple-50/30 border border-purple-200/80 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Global Export Performance
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                    International
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Foreign currency bookings converted to INR at official transaction exchange rates
                </p>
              </div>
            </div>
            <Link
              href={`/sales/orders?period=${filterParams.period}${filterParams.organizationId ? `&organizationId=${filterParams.organizationId}` : ""}`}
              className="text-xs text-purple-700 hover:text-purple-800 font-semibold"
            >
              Export Orders →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/80 border border-purple-100 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Export Quotes</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">{formatIndianCurrency(breakdown.quotations.exportValue)}</div>
              <div className="text-[10px] text-purple-600 font-semibold">{breakdown.quotations.exportCount} quotes</div>
            </div>
            <div className="bg-white/80 border border-purple-100 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Export Orders (SO)</span>
              <div className="text-sm font-black text-purple-700 mt-0.5">{formatIndianCurrency(breakdown.orders.exportValue)}</div>
              <div className="text-[10px] text-purple-600 font-semibold">{breakdown.orders.exportCount} orders</div>
            </div>
            <div className="bg-white/80 border border-purple-100 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Export Invoiced</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">{formatIndianCurrency(breakdown.invoices.exportValue)}</div>
              <div className="text-[10px] text-purple-600 font-semibold">{breakdown.invoices.exportCount} bills</div>
            </div>
            <div className="bg-white/80 border border-purple-100 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cash Collected</span>
              <div className="text-sm font-black text-emerald-600 mt-0.5">{formatIndianCurrency(breakdown.collections.exportCollected)}</div>
              <div className="text-[10px] text-slate-400">realized revenue</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-amber-50/30 border border-amber-200/80 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-amber-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Intercompany Trade • {breakdown.targetSiblingShort}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Sibling Company
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium truncate max-w-[320px] sm:max-w-none">
                  Transactions with {breakdown.targetSibling}
                </p>
              </div>
            </div>
            <Link
              href={`/sales/orders?period=${filterParams.period}${filterParams.organizationId ? `&organizationId=${filterParams.organizationId}` : ""}`}
              className="text-xs text-amber-700 hover:text-amber-800 font-semibold"
            >
              IC Orders →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/80 border border-amber-100 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IC Quotes</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">{formatIndianCurrency(breakdown.quotations.icValue)}</div>
              <div className="text-[10px] text-amber-700 font-semibold">{breakdown.quotations.icCount} quotes</div>
            </div>
            <div className="bg-white/80 border border-amber-100 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IC Orders (SO)</span>
              <div className="text-sm font-black text-amber-700 mt-0.5">{formatIndianCurrency(breakdown.orders.icValue)}</div>
              <div className="text-[10px] text-amber-700 font-semibold">{breakdown.orders.icCount} orders</div>
            </div>
            <div className="bg-white/80 border border-amber-100 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IC Invoiced</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">{formatIndianCurrency(breakdown.invoices.icValue)}</div>
              <div className="text-[10px] text-amber-700 font-semibold">{breakdown.invoices.icCount} bills</div>
            </div>
            <div className="bg-white/80 border border-amber-100 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IC Collected</span>
              <div className="text-sm font-black text-emerald-600 mt-0.5">{formatIndianCurrency(breakdown.collections.icCollected)}</div>
              <div className="text-[10px] text-slate-400">settled transfer</div>
            </div>
          </div>
        </div>
      </div> */}

      {/* Business Trends & Conversion Velocity Charts Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Business Trends & Conversion Velocity
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Performance trajectories plotted on a{" "}
              <span className="font-semibold text-orange-600">
                {granularity === "monthly" ? "monthly" : "weekly"}
              </span>{" "}
              basis for the selected timeline
            </p>
          </div>

          {/* Granularity Switcher: Monthly vs Weekly */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto border border-slate-200/60">
            <Link
              href={buildGranularityHref("monthly")}
              className={`px-3 py-1 rounded-lg transition-all ${
                granularity === "monthly"
                  ? "bg-white text-orange-600 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Monthly View
            </Link>
            <Link
              href={buildGranularityHref("weekly")}
              className={`px-3 py-1 rounded-lg transition-all ${
                granularity === "weekly"
                  ? "bg-white text-orange-600 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Weekly View
            </Link>
          </div>
        </div>

        {/* Full-width charts: 1 per page width */}
        <div className="space-y-6">
          {/* Chart 1: Quotations vs Converted Orders */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Quotation Trend</h3>
                <p className="text-[11px] text-slate-500 font-medium">Quote volume, conversion count & value</p>
              </div>
              <Link href="/sales/quotations" className="text-xs text-orange-600 hover:text-orange-700 font-semibold">
                Details →
              </Link>
            </div>
            <QuotationVsConvertedChart
              data={charts.quotationVsConvertedTrend}
              organizationId={filterParams.organizationId}
            />
          </div>

          {/* Chart 2: Invoice Value & Collections */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sales Order Trend</h3>
                <p className="text-[11px] text-slate-500 font-medium">Confirmed booking value trajectory</p>
              </div>
              <Link href="/sales/orders" className="text-xs text-orange-600 hover:text-orange-700 font-semibold">
                Orders →
              </Link>
            </div>
            <SalesOrderChart
              data={charts.salesOrderTrend}
              organizationId={filterParams.organizationId}
            />
          </div>
        </div>

          {/* Chart 3: Sales Order Value Trend */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Invoice Value vs Collections</h3>
                <p className="text-[11px] text-slate-500 font-medium">Billing recognized vs actual payments deposited</p>
              </div>
              <Link href="/finance" className="text-xs text-orange-600 hover:text-orange-700 font-semibold">
                Finance →
              </Link>
            </div>
            <MonthlyInvoiceChart
              data={charts.monthlyInvoiceTrend}
              organizationId={filterParams.organizationId}
            />
          </div>

        {/* Side-by-side charts: 2 per page width */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 4: Field Visit Activity (Visit DB) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Field Visit Activity</h3>
                <p className="text-[11px] text-slate-500 font-medium">Completed customer meetings vs pending follow-ups</p>
              </div>
              <Link href="/visits" className="text-xs text-orange-600 hover:text-orange-700 font-semibold">
                Visits →
              </Link>
            </div>
            <VisitActivityChart data={charts.visitActivityTrend} />
          </div>

          {/* Chart 5: Customer Acquisition Trend */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">New Customer Acquisition</h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Actual accounts registered in Zoho Books customer master
                </p>
              </div>
              <Link href="/customers" className="text-xs text-orange-600 hover:text-orange-700 font-semibold">
                Customers →
              </Link>
            </div>
            <CustomerAcquisitionChart data={charts.newCustomerTrend} />
          </div>
        </div>
      </div>

      {/* Cross-System Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Quotations */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-orange-600" />
              Latest Quotations 
            </h3>
            <Link
              href={`/sales/quotations?period=${filterParams.period}${filterParams.organizationId ? `&organizationId=${filterParams.organizationId}` : ""}`}
              className="text-xs text-orange-600 hover:text-orange-700 font-semibold"
            >
              View All →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-2.5 pr-4 font-bold uppercase tracking-wider text-[11px]">Quotation #</th>
                  <th className="pb-2.5 px-4 font-bold uppercase tracking-wider text-[11px]">Customer</th>
                  <th className="pb-2.5 pr-8 pl-4 font-bold uppercase tracking-wider text-[11px]">Amount</th>
                  <th className="pb-2.5 pl-8 pr-4 font-bold uppercase tracking-wider text-[11px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentActivities.recentQuotations.map((q) => (
                  <tr key={q.id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="py-2.5 pr-4 font-bold text-orange-600">{q.quotationNumber}</td>
                    <td className="py-2.5 px-4 text-slate-800 font-medium truncate max-w-[150px]">{q.customerName}</td>
                    <td className="py-2.5 pr-8 pl-4 font-bold text-slate-900 whitespace-nowrap">{formatIndianCurrency(q.totalAmount)}</td>
                    <td className="py-2.5 pl-8 pr-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${
                          q.isConverted
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : q.status === "approved"
                            ? "bg-orange-50 text-orange-700 border border-orange-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Field Visits */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Recent Customer Visits 
            </h3>
            <Link
              href={`/visits?period=${filterParams.period}${filterParams.organizationId ? `&organizationId=${filterParams.organizationId}` : ""}`}
              className="text-xs text-orange-600 hover:text-orange-700 font-semibold"
            >
              View All →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-2.5 font-bold uppercase tracking-wider text-[11px]">Sales Rep</th>
                  <th className="pb-2.5 font-bold uppercase tracking-wider text-[11px]">Customer</th>
                  <th className="pb-2.5 font-bold uppercase tracking-wider text-[11px]">Date</th>
                  <th className="pb-2.5 font-bold uppercase tracking-wider text-[11px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentActivities.recentVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="py-2.5 font-bold text-slate-900">
                      {v.employee?.user?.name || "Unassigned"}
                    </td>
                    <td className="py-2.5 text-slate-700 font-medium truncate max-w-[150px]">
                      {v.customer?.name || "Customer"}
                    </td>
                    <td className="py-2.5 text-slate-500 font-medium">{format(v.visitDate, "MMM dd, yyyy")}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          v.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
