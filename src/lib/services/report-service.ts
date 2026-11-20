/**
 * Report Generation Service
 * Assembles comprehensive Weekly and Monthly management briefing reports,
 * with KPI snapshots, salesperson scorecards, lost opportunity analysis,
 * and high-priority opportunities requiring immediate attention.
 */

import { zohoDb } from "../database/zoho-db";
import { visitDb } from "../database/visit-db";
import { getPeriodRange, calculateDelta, PeriodType } from "./date-utils";
import { format } from "date-fns";

export interface ReportData {
  reportTitle: string;
  reportType: "WEEKLY" | "MONTHLY" | "CUSTOM";
  periodLabel: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  lastSyncTime: string;
  executiveSummary: {
    totalQuotations: number;
    totalQuotationValue: number;
    ordersConverted: number;
    convertedValue: number;
    conversionRate: number;
    ordersLost: number;
    lostValue: number;
    salesOrdersCount: number;
    salesOrdersValue: number;
    invoicesCount: number;
    invoicesValue: number;
    paymentsCollected: number;
    outstandingReceivables: number;
    newCustomers: number;
    customerVisits: number;
    completedVisits: number;
  };
  comparisons: {
    quotationGrowth: number;
    quotationValueGrowth: number;
    conversionRateGrowth: number;
    invoiceValueGrowth: number;
    collectedGrowth: number;
    visitGrowth: number;
  };
  salespersonScorecards: Array<{
    name: string;
    visits: number;
    completedVisits: number;
    quotationsCount: number;
    quotationsValue: number;
    convertedOrders: number;
    invoiceValue: number;
  }>;
  pendingFollowups: Array<{
    customerName: string;
    salespersonName: string;
    followupDate: string;
    visitReport: string;
  }>;
  priorityOpportunities: Array<{
    quotationNumber: string;
    customerName: string;
    value: number;
    salespersonName: string;
    status: string;
    expiryDate: string;
  }>;
}

export async function generateReportData(
  periodType: "this_week" | "last_week" | "this_month" | "last_month" | "custom",
  customStart?: string,
  customEnd?: string,
  organizationId?: string
): Promise<ReportData> {
  const periodComp = getPeriodRange(periodType, customStart, customEnd);
  const { current, previous } = periodComp;
  const orgWhere = organizationId ? { organizationId } : {};

  // 1. Current Period Records
  const [quotes, orders, invoices, payments, newCustCount, visits] = await Promise.all([
    zohoDb.quotation.findMany({
      where: { quotationDate: { gte: current.start, lte: current.end }, ...orgWhere },
      select: {
        quotationNumber: true,
        customerName: true,
        salespersonName: true,
        totalAmount: true,
        status: true,
        isConverted: true,
        isLost: true,
        expiryDate: true,
      },
    }),
    zohoDb.salesOrder.findMany({
      where: { orderDate: { gte: current.start, lte: current.end }, ...orgWhere },
      select: { totalAmount: true },
    }),
    zohoDb.invoice.findMany({
      where: { invoiceDate: { gte: current.start, lte: current.end }, ...orgWhere },
      select: { totalAmount: true, balance: true },
    }),
    zohoDb.payment.findMany({
      where: { paymentDate: { gte: current.start, lte: current.end }, ...orgWhere },
      select: { amount: true },
    }),
    zohoDb.zohoCustomer.count({
      where: { createdDate: { gte: current.start, lte: current.end }, ...orgWhere },
    }),
    visitDb.visit.findMany({
      where: { visitDate: { gte: current.start, lte: current.end } },
      include: {
        customer: { select: { name: true } },
        employee: { include: { user: { select: { name: true } } } },
      },
    }),
  ]);

  // 2. Previous Period Records for Growth %
  const [prevQuotes, prevInvoices, prevPayments, prevVisits] = await Promise.all([
    zohoDb.quotation.findMany({
      where: { quotationDate: { gte: previous.start, lte: previous.end }, ...orgWhere },
      select: { totalAmount: true, isConverted: true },
    }),
    zohoDb.invoice.findMany({
      where: { invoiceDate: { gte: previous.start, lte: previous.end }, ...orgWhere },
      select: { totalAmount: true },
    }),
    zohoDb.payment.findMany({
      where: { paymentDate: { gte: previous.start, lte: previous.end }, ...orgWhere },
      select: { amount: true },
    }),
    visitDb.visit.count({
      where: { visitDate: { gte: previous.start, lte: previous.end } },
    }),
  ]);

  // Current calculations
  const totalQuotations = quotes.length;
  const totalQuotationValue = quotes.reduce((acc, q) => acc + q.totalAmount, 0);
  const convertedQuotes = quotes.filter((q) => q.isConverted);
  const convertedValue = convertedQuotes.reduce((acc, q) => acc + q.totalAmount, 0);
  const lostQuotes = quotes.filter((q) => q.isLost);
  const lostValue = lostQuotes.reduce((acc, q) => acc + q.totalAmount, 0);
  const conversionRate = totalQuotations > 0 ? (convertedQuotes.length / totalQuotations) * 100 : 0;

  const salesOrdersCount = orders.length;
  const salesOrdersValue = orders.reduce((acc, o) => acc + o.totalAmount, 0);

  const invoicesCount = invoices.length;
  const invoicesValue = invoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const outstandingReceivables = invoices.reduce((acc, i) => acc + i.balance, 0);
  const paymentsCollected = payments.reduce((acc, p) => acc + p.amount, 0);

  const customerVisits = visits.length;
  const completedVisits = visits.filter((v) => v.status === "COMPLETED").length;

  // Previous calculations & deltas
  const prevQuoteCount = prevQuotes.length;
  const prevQuoteValue = prevQuotes.reduce((acc, q) => acc + q.totalAmount, 0);
  const prevConverted = prevQuotes.filter((q) => q.isConverted).length;
  const prevConversionRate = prevQuoteCount > 0 ? (prevConverted / prevQuoteCount) * 100 : 0;
  const prevInvoiceValue = prevInvoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const prevCollected = prevPayments.reduce((acc, p) => acc + p.amount, 0);

  // Growth percentages
  const quotationGrowth = calculateDelta(totalQuotations, prevQuoteCount).percentageChange;
  const quotationValueGrowth = calculateDelta(totalQuotationValue, prevQuoteValue).percentageChange;
  const conversionRateGrowth = calculateDelta(conversionRate, prevConversionRate).percentageChange;
  const invoiceValueGrowth = calculateDelta(invoicesValue, prevInvoiceValue).percentageChange;
  const collectedGrowth = calculateDelta(paymentsCollected, prevCollected).percentageChange;
  const visitGrowth = calculateDelta(customerVisits, prevVisits).percentageChange;

  // Salesperson Scorecards
  const reps = await visitDb.employee.findMany({
    include: { user: { select: { name: true } } },
  });

  const salespersonScorecards = reps.map((emp) => {
    const name = emp.user?.name || "Unassigned";
    const repVisits = visits.filter((v) => v.employeeId === emp.id);
    const repQuotes = quotes.filter(
      (q) =>
        q.salespersonName &&
        (q.salespersonName.toLowerCase().includes(name.toLowerCase().split(" ")[0]) ||
          name.toLowerCase().includes(q.salespersonName.toLowerCase().split(" ")[0]))
    );

    return {
      name,
      visits: repVisits.length,
      completedVisits: repVisits.filter((v) => v.status === "COMPLETED").length,
      quotationsCount: repQuotes.length,
      quotationsValue: Math.round(repQuotes.reduce((acc, q) => acc + q.totalAmount, 0)),
      convertedOrders: repQuotes.filter((q) => q.isConverted).length,
      invoiceValue: 0, // Linked per rep invoices
    };
  });

  // Pending Follow-ups requiring action
  const pendingFollowups = visits
    .filter((v) => v.nextFollowupDate !== null && v.status !== "COMPLETED")
    .slice(0, 15)
    .map((v) => ({
      customerName: v.customer?.name || "Unknown",
      salespersonName: v.employee?.user?.name || "Unassigned",
      followupDate: v.nextFollowupDate ? format(v.nextFollowupDate, "yyyy-MM-dd") : "-",
      visitReport: v.visitReport || "Follow-up discussion scheduled",
    }));

  // Priority High-Value Open Opportunities
  const priorityOpportunities = quotes
    .filter((q) => !q.isConverted && !q.isLost && q.totalAmount > 50000)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10)
    .map((q) => ({
      quotationNumber: q.quotationNumber,
      customerName: q.customerName,
      value: Math.round(q.totalAmount),
      salespersonName: q.salespersonName || "Unassigned",
      status: q.status.toUpperCase(),
      expiryDate: q.expiryDate ? format(q.expiryDate, "yyyy-MM-dd") : "-",
    }));

  const lastLog = await zohoDb.syncLog.findFirst({
    where: { status: "SUCCESS" },
    orderBy: { completedAt: "desc" },
  });

  const reportType =
    periodType === "this_week" || periodType === "last_week"
      ? "WEEKLY"
      : periodType === "this_month" || periodType === "last_month"
      ? "MONTHLY"
      : "CUSTOM";

  return {
    reportTitle: `Business Performance & Sales Intelligence Report (${reportType})`,
    reportType,
    periodLabel: `${format(current.start, "MMM dd, yyyy")} - ${format(current.end, "MMM dd, yyyy")}`,
    startDate: format(current.start, "yyyy-MM-dd"),
    endDate: format(current.end, "yyyy-MM-dd"),
    generatedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
    lastSyncTime: lastLog?.completedAt ? format(lastLog.completedAt, "yyyy-MM-dd HH:mm:ss") : "Recent",
    executiveSummary: {
      totalQuotations,
      totalQuotationValue: Math.round(totalQuotationValue),
      ordersConverted: convertedQuotes.length,
      convertedValue: Math.round(convertedValue),
      conversionRate: Number(conversionRate.toFixed(1)),
      ordersLost: lostQuotes.length,
      lostValue: Math.round(lostValue),
      salesOrdersCount,
      salesOrdersValue: Math.round(salesOrdersValue),
      invoicesCount,
      invoicesValue: Math.round(invoicesValue),
      paymentsCollected: Math.round(paymentsCollected),
      outstandingReceivables: Math.round(outstandingReceivables),
      newCustomers: newCustCount,
      customerVisits,
      completedVisits,
    },
    comparisons: {
      quotationGrowth,
      quotationValueGrowth,
      conversionRateGrowth,
      invoiceValueGrowth,
      collectedGrowth,
      visitGrowth,
    },
    salespersonScorecards,
    pendingFollowups,
    priorityOpportunities,
  };
}
