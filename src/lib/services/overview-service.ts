/**
 * Overview Dashboard Business Logic Service
 * Combines Zoho reporting data and Visit Management data, calculating 10 core KPIs
 * and dynamically adaptive trend datasets (monthly for annual/custom scopes, weekly for monthly scopes).
 */

import { zohoDb } from "../database/zoho-db";
import { visitDb } from "../database/visit-db";
import {
  PeriodType,
  getPeriodRange,
  calculateDelta,
  PeriodComparison,
  MetricDelta,
} from "./date-utils";
import {
  format,
  eachMonthOfInterval,
  eachWeekOfInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  differenceInDays,
} from "date-fns";

export interface OverviewFilterParams {
  period?: PeriodType;
  startDate?: string;
  endDate?: string;
  salespersonName?: string;
  customerId?: string;
  status?: string;
  organizationId?: string;
  granularity?: "monthly" | "weekly";
}

export interface ExecutiveBreakdown {
  targetSibling: string;
  targetSiblingShort: string;
  quotations: {
    domesticCount: number;
    exportCount: number;
    domesticValue: number;
    exportValue: number;
    icCount: number;
    icValue: number;
  };
  orders: {
    domesticCount: number;
    exportCount: number;
    domesticValue: number;
    exportValue: number;
    icCount: number;
    icValue: number;
  };
  invoices: {
    domesticCount: number;
    exportCount: number;
    domesticValue: number;
    exportValue: number;
    icCount: number;
    icValue: number;
  };
  collections: {
    domesticCollected: number;
    exportCollected: number;
    icCollected: number;
  };
}

export interface OverviewDashboardData {
  period: PeriodComparison;
  granularity: "monthly" | "weekly";
  organizationId?: string;
  breakdown: ExecutiveBreakdown;
  kpis: {
    totalQuotations: MetricDelta;
    totalQuotationValue: MetricDelta;
    ordersConverted: MetricDelta;
    ordersLost: MetricDelta;
    conversionRate: MetricDelta;
    totalSalesOrders: MetricDelta;
    totalSalesOrderValue: MetricDelta;
    totalInvoices: MetricDelta;
    totalInvoiceValue: MetricDelta;
    amountCollected: MetricDelta;
    newCustomers: MetricDelta;
    totalCustomerVisits: MetricDelta;
    completedVisits: MetricDelta;
  };
  charts: {
    quotationVsConvertedTrend: Array<{
      period: string;
      quotations: number;
      converted: number;
      quotationValue: number;
      domesticValue: number;
      exportValue: number;
      domesticQuotes: number;
      exportQuotes: number;
      icValue: number;
      icCount: number;
    }>;
    monthlyInvoiceTrend: Array<{
      month: string;
      invoices: number;
      value: number;
      domesticValue: number;
      exportValue: number;
      domesticInvoices: number;
      exportInvoices: number;
      collected: number;
      icValue: number;
      icInvoices: number;
    }>;
    salesOrderTrend: Array<{
      month: string;
      orders: number;
      value: number;
      domesticValue: number;
      exportValue: number;
      domesticOrders: number;
      exportOrders: number;
      icValue: number;
      icOrders: number;
      closedOrders?: number;
    }>;
    newCustomerTrend: Array<{
      month: string;
      newCustomers: number;
    }>;
    visitActivityTrend: Array<{
      period: string;
      completed: number;
      pending: number;
      total: number;
    }>;
    paymentStatusDistribution: Array<{
      status: string;
      count: number;
      value: number;
    }>;
  };
  recentActivities: {
    recentQuotations: any[];
    recentVisits: any[];
  };
}

export async function getOverviewData(params: OverviewFilterParams = {}): Promise<OverviewDashboardData> {
  const periodComp = getPeriodRange(params.period, params.startDate, params.endDate);
  const { current } = periodComp;

  // Build Prisma where clauses for Zoho DB
  const zohoBaseWhere: any = {};
  if (params.organizationId) {
    zohoBaseWhere.organizationId = params.organizationId;
  }
  if (params.salespersonName) {
    zohoBaseWhere.salespersonName = { contains: params.salespersonName, mode: "insensitive" };
  }
  if (params.customerId) {
    zohoBaseWhere.customerId = params.customerId;
  }

  // Determine timeline granularity:
  // If explicitly requested, use it; otherwise, if timeline > 35 days (e.g. 1 year, 2025 Apr to 2026 Mar),
  // use monthly buckets; for <= 35 days (e.g. This Month, Last Month), use weekly buckets.
  const daysDiff = differenceInDays(current.end, current.start);
  const isMonthly = params.granularity === "monthly" || (!params.granularity && daysDiff > 35);
  const effectiveGranularity: "monthly" | "weekly" = isMonthly ? "monthly" : "weekly";

  // Build trend intervals according to timeline
  let trendBuckets: Array<{ start: Date; end: Date; label: string }> = [];

  if (isMonthly) {
    const months = eachMonthOfInterval({ start: current.start, end: current.end });
    trendBuckets = months.map((mStart) => {
      const rawEnd = endOfMonth(mStart);
      const mEnd = rawEnd > current.end ? current.end : rawEnd;
      const actualStart = mStart < current.start ? current.start : mStart;
      return {
        start: actualStart,
        end: mEnd,
        label: format(mStart, "MMM yyyy"),
      };
    });
  } else {
    const weeks = eachWeekOfInterval({ start: current.start, end: current.end }, { weekStartsOn: 1 });
    trendBuckets = weeks.map((wStart, idx) => {
      const rawEnd = endOfWeek(wStart, { weekStartsOn: 1 });
      const wEnd = rawEnd > current.end ? current.end : rawEnd;
      const actualStart = wStart < current.start ? current.start : wStart;
      return {
        start: actualStart,
        end: wEnd,
        label: `W${idx + 1} (${format(actualStart, "dd MMM")} - ${format(wEnd, "dd MMM")})`,
      };
    });
  }

  // Fast single-pass data fetch:
  // Query only the current active period bounds across both DBs (eliminating 13 redundant queries)
  const [
    curQuotes,
    curOrders,
    curInvoices,
    curPayments,
    curNewCustomers,
    curVisits,
    recentQuotations,
    recentVisits,
  ] = await Promise.all([
    // Quotations in current timeline
    zohoDb.quotation.findMany({
      where: {
        ...zohoBaseWhere,
        quotationDate: { gte: current.start, lte: current.end },
        ...(params.status ? { status: params.status } : {}),
      },
      select: {
        quotationDate: true,
        totalAmount: true,
        isConverted: true,
        isLost: true,
        businessType: true,
        isIntercompany: true,
      },
    }),

    // Sales Orders in current timeline
    zohoDb.salesOrder.findMany({
      where: {
        ...zohoBaseWhere,
        orderDate: { gte: current.start, lte: current.end },
      },
      select: {
        orderDate: true,
        totalAmount: true,
        status: true,
        businessType: true,
        isIntercompany: true,
      },
    }),

    // Invoices in current timeline
    zohoDb.invoice.findMany({
      where: {
        ...zohoBaseWhere,
        invoiceDate: { gte: current.start, lte: current.end },
      },
      select: {
        invoiceDate: true,
        totalAmount: true,
        balance: true,
        status: true,
        businessType: true,
        isIntercompany: true,
      },
    }),

    // Payments in current timeline
    zohoDb.payment.findMany({
      where: {
        ...(params.organizationId ? { organizationId: params.organizationId } : {}),
        paymentDate: { gte: current.start, lte: current.end },
      },
      select: {
        paymentDate: true,
        amount: true,
      },
    }),

    // New Customers created in current timeline
    zohoDb.zohoCustomer.findMany({
      where: {
        ...(params.organizationId ? { organizationId: params.organizationId } : {}),
        createdDate: { gte: current.start, lte: current.end },
      },
      select: { createdDate: true },
    }),

    // Visits logged in current timeline
    visitDb.visit.findMany({
      where: {
        visitDate: { gte: current.start, lte: current.end },
      },
      select: {
        visitDate: true,
        status: true,
      },
    }),

    // Recent quotations audit trail
    zohoDb.quotation.findMany({
      take: 6,
      orderBy: { quotationDate: "desc" },
      select: {
        id: true,
        quotationNumber: true,
        customerName: true,
        salespersonName: true,
        quotationDate: true,
        totalAmount: true,
        status: true,
        isConverted: true,
      },
    }),

    // Recent visits audit trail
    visitDb.visit.findMany({
      take: 6,
      orderBy: { visitDate: "desc" },
      include: {
        customer: { select: { name: true, companyName: true } },
        employee: { include: { user: { select: { name: true } } } },
      },
    }),
  ]);

  // Current KPI aggregations
  const curQuoteCount = curQuotes.length;
  const curQuoteValue = curQuotes.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
  const curConverted = curQuotes.filter((q) => q.isConverted).length;
  const curLost = curQuotes.filter((q) => q.isLost).length;
  const curConversionRate = curQuoteCount > 0 ? (curConverted / curQuoteCount) * 100 : 0;

  const curOrderCount = curOrders.length;
  const curOrderValue = curOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);

  const curInvoiceCount = curInvoices.length;
  const curInvoiceValue = curInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);

  // Amount collected: accounts for paid portions on invoices (totalAmount - balance) and direct payment receipts
  const curInvoicePaid = curInvoices.reduce(
    (acc, inv) => acc + Math.max(0, (inv.totalAmount || 0) - (inv.balance || 0)),
    0
  );
  const curPaymentReceipts = curPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const curCollected = Math.max(curInvoicePaid, curPaymentReceipts);

  const curVisitCount = curVisits.length;
  const curCompletedVisits = curVisits.filter((v) => v.status === "COMPLETED").length;

  // Process timeline trend intervals in memory
  const quotationVsConvertedTrend = [];
  const monthlyInvoiceTrend = [];
  const salesOrderTrend = [];
  const newCustomerTrend = [];
  const visitActivityTrend = [];

  for (const bucket of trendBuckets) {
    const { start: bStart, end: bEnd, label: bLabel } = bucket;

    // Quotes in bucket
    const bQuotes = curQuotes.filter((q) => q.quotationDate >= bStart && q.quotationDate <= bEnd);
    const bQuotesDomestic = bQuotes.filter((q) => q.businessType !== "Export");
    const bQuotesExport = bQuotes.filter((q) => q.businessType === "Export");
    const bQuotesIC = bQuotes.filter((q) => q.isIntercompany);

    quotationVsConvertedTrend.push({
      period: bLabel,
      quotations: bQuotes.length,
      converted: bQuotes.filter((q) => q.isConverted).length,
      quotationValue: Math.round(bQuotes.reduce((acc, q) => acc + (q.totalAmount || 0), 0)),
      domesticValue: Math.round(bQuotesDomestic.reduce((acc, q) => acc + (q.totalAmount || 0), 0)),
      exportValue: Math.round(bQuotesExport.reduce((acc, q) => acc + (q.totalAmount || 0), 0)),
      domesticQuotes: bQuotesDomestic.length,
      exportQuotes: bQuotesExport.length,
      icValue: Math.round(bQuotesIC.reduce((acc, q) => acc + (q.totalAmount || 0), 0)),
      icCount: bQuotesIC.length,
    });

    // Invoices & Collections in bucket
    const bInvoices = curInvoices.filter((i) => i.invoiceDate >= bStart && i.invoiceDate <= bEnd);
    const bInvoicesDomestic = bInvoices.filter((i) => i.businessType !== "Export");
    const bInvoicesExport = bInvoices.filter((i) => i.businessType === "Export");
    const bInvoicesIC = bInvoices.filter((i) => i.isIntercompany);

    const bInvoicePaid = bInvoices.reduce(
      (acc, i) => acc + Math.max(0, (i.totalAmount || 0) - (i.balance || 0)),
      0
    );
    const bPayments = curPayments.filter(
      (p) => p.paymentDate && p.paymentDate >= bStart && p.paymentDate <= bEnd
    );
    const bPaymentReceipts = bPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    monthlyInvoiceTrend.push({
      month: bLabel,
      invoices: bInvoices.length,
      value: Math.round(bInvoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0)),
      domesticValue: Math.round(bInvoicesDomestic.reduce((acc, i) => acc + (i.totalAmount || 0), 0)),
      exportValue: Math.round(bInvoicesExport.reduce((acc, i) => acc + (i.totalAmount || 0), 0)),
      domesticInvoices: bInvoicesDomestic.length,
      exportInvoices: bInvoicesExport.length,
      collected: Math.round(Math.max(bInvoicePaid, bPaymentReceipts)),
      icValue: Math.round(bInvoicesIC.reduce((acc, i) => acc + (i.totalAmount || 0), 0)),
      icInvoices: bInvoicesIC.length,
    });

    // Sales Orders in bucket
    const bOrders = curOrders.filter((o) => o.orderDate >= bStart && o.orderDate <= bEnd);
    const bOrdersDomestic = bOrders.filter((o) => o.businessType !== "Export");
    const bOrdersExport = bOrders.filter((o) => o.businessType === "Export");
    const bOrdersIC = bOrders.filter((o) => o.isIntercompany);

    salesOrderTrend.push({
      month: bLabel,
      orders: bOrders.length,
      value: Math.round(bOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0)),
      domesticValue: Math.round(bOrdersDomestic.reduce((acc, o) => acc + (o.totalAmount || 0), 0)),
      exportValue: Math.round(bOrdersExport.reduce((acc, o) => acc + (o.totalAmount || 0), 0)),
      domesticOrders: bOrdersDomestic.length,
      exportOrders: bOrdersExport.length,
      icValue: Math.round(bOrdersIC.reduce((acc, o) => acc + (o.totalAmount || 0), 0)),
      icOrders: bOrdersIC.length,
      closedOrders: bOrders.filter((o) => o.status === "invoiced" || o.status === "closed").length,
    });

    // New Customers in bucket
    const bCust = curNewCustomers.filter((c) => c.createdDate && c.createdDate >= bStart && c.createdDate <= bEnd);
    newCustomerTrend.push({
      month: bLabel,
      newCustomers: bCust.length,
    });

    // Visits in bucket
    const bVisits = curVisits.filter((v) => v.visitDate >= bStart && v.visitDate <= bEnd);
    visitActivityTrend.push({
      period: bLabel,
      completed: bVisits.filter((v) => v.status === "COMPLETED").length,
      pending: bVisits.filter((v) => v.status !== "COMPLETED").length,
      total: bVisits.length,
    });
  }

  // Segment Breakdown: Domestic vs Export & Intercompany
  const curQuotesDomestic = curQuotes.filter((q) => q.businessType !== "Export");
  const curQuotesExport = curQuotes.filter((q) => q.businessType === "Export");
  const curQuotesIC = curQuotes.filter((q) => q.isIntercompany);

  const curOrdersDomestic = curOrders.filter((o) => o.businessType !== "Export");
  const curOrdersExport = curOrders.filter((o) => o.businessType === "Export");
  const curOrdersIC = curOrders.filter((o) => o.isIntercompany);

  const curInvoicesDomestic = curInvoices.filter((i) => i.businessType !== "Export");
  const curInvoicesExport = curInvoices.filter((i) => i.businessType === "Export");
  const curInvoicesIC = curInvoices.filter((i) => i.isIntercompany);

  const targetSibling =
    params.organizationId === "771755208"
      ? "Zeetork Automation & Control Pvt Ltd"
      : params.organizationId === "876204905"
      ? "TruFlow Solutions Pvt Ltd"
      : "Zeetork & TruFlow Sibling Companies";

  const targetSiblingShort =
    params.organizationId === "771755208"
      ? "ZT"
      : params.organizationId === "876204905"
      ? "TF"
      : "ZT/TF";

  const breakdown: ExecutiveBreakdown = {
    targetSibling,
    targetSiblingShort,
    quotations: {
      domesticCount: curQuotesDomestic.length,
      exportCount: curQuotesExport.length,
      domesticValue: Math.round(curQuotesDomestic.reduce((acc, q) => acc + (q.totalAmount || 0), 0)),
      exportValue: Math.round(curQuotesExport.reduce((acc, q) => acc + (q.totalAmount || 0), 0)),
      icCount: curQuotesIC.length,
      icValue: Math.round(curQuotesIC.reduce((acc, q) => acc + (q.totalAmount || 0), 0)),
    },
    orders: {
      domesticCount: curOrdersDomestic.length,
      exportCount: curOrdersExport.length,
      domesticValue: Math.round(curOrdersDomestic.reduce((acc, o) => acc + (o.totalAmount || 0), 0)),
      exportValue: Math.round(curOrdersExport.reduce((acc, o) => acc + (o.totalAmount || 0), 0)),
      icCount: curOrdersIC.length,
      icValue: Math.round(curOrdersIC.reduce((acc, o) => acc + (o.totalAmount || 0), 0)),
    },
    invoices: {
      domesticCount: curInvoicesDomestic.length,
      exportCount: curInvoicesExport.length,
      domesticValue: Math.round(curInvoicesDomestic.reduce((acc, i) => acc + (i.totalAmount || 0), 0)),
      exportValue: Math.round(curInvoicesExport.reduce((acc, i) => acc + (i.totalAmount || 0), 0)),
      icCount: curInvoicesIC.length,
      icValue: Math.round(curInvoicesIC.reduce((acc, i) => acc + (i.totalAmount || 0), 0)),
    },
    collections: {
      domesticCollected: Math.round(
        curInvoicesDomestic.reduce((acc, i) => acc + Math.max(0, (i.totalAmount || 0) - (i.balance || 0)), 0)
      ),
      exportCollected: Math.round(
        curInvoicesExport.reduce((acc, i) => acc + Math.max(0, (i.totalAmount || 0) - (i.balance || 0)), 0)
      ),
      icCollected: Math.round(
        curInvoicesIC.reduce((acc, i) => acc + Math.max(0, (i.totalAmount || 0) - (i.balance || 0)), 0)
      ),
    },
  };

  return {
    period: periodComp,
    granularity: effectiveGranularity,
    organizationId: params.organizationId,
    breakdown,
    kpis: {
      totalQuotations: calculateDelta(curQuoteCount, 0),
      totalQuotationValue: calculateDelta(curQuoteValue, 0),
      ordersConverted: calculateDelta(curConverted, 0),
      ordersLost: calculateDelta(curLost, 0, true),
      conversionRate: calculateDelta(curConversionRate, 0),
      totalSalesOrders: calculateDelta(curOrderCount, 0),
      totalSalesOrderValue: calculateDelta(curOrderValue, 0),
      totalInvoices: calculateDelta(curInvoiceCount, 0),
      totalInvoiceValue: calculateDelta(curInvoiceValue, 0),
      amountCollected: calculateDelta(curCollected, 0),
      newCustomers: calculateDelta(curNewCustomers.length, 0),
      totalCustomerVisits: calculateDelta(curVisitCount, 0),
      completedVisits: calculateDelta(curCompletedVisits, 0),
    },
    charts: {
      quotationVsConvertedTrend,
      monthlyInvoiceTrend,
      salesOrderTrend,
      newCustomerTrend,
      visitActivityTrend,
      paymentStatusDistribution: [],
    },
    recentActivities: {
      recentQuotations,
      recentVisits,
    },
  };
}
