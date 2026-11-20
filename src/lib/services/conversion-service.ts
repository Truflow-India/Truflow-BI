/**
 * Order Conversion & Lost Order Analytics Service
 * Tracks the progression from Quotation -> Order -> Invoice,
 * calculates funnel metrics by count & value, and monitors lost opportunities.
 */

import { zohoDb } from "../database/zoho-db";
import { PeriodType, getPeriodRange } from "./date-utils";
import { format } from "date-fns";

export interface ConversionFilterParams {
  period?: PeriodType;
  startDate?: string;
  endDate?: string;
  organizationId?: string;
  salespersonName?: string;
}

export async function getConversionAnalytics(params: ConversionFilterParams = {}) {
  const periodComp = getPeriodRange(params.period, params.startDate, params.endDate);
  const { current } = periodComp;

  const baseWhere: any = {
    quotationDate: { gte: current.start, lte: current.end },
  };

  if (params.organizationId) {
    baseWhere.organizationId = params.organizationId;
  }
  if (params.salespersonName && params.salespersonName !== "ALL") {
    baseWhere.salespersonName = { contains: params.salespersonName, mode: "insensitive" };
  }

  // 1. Fetch eligible quotation population in period
  const quotations = await zohoDb.quotation.findMany({
    where: baseWhere,
    select: {
      id: true,
      zohoQuotationId: true,
      quotationNumber: true,
      customerName: true,
      salespersonName: true,
      quotationDate: true,
      totalAmount: true,
      status: true,
      isConverted: true,
      isLost: true,
      lostReason: true,
      lostDate: true,
      convertedSalesOrderNumber: true,
    },
  });

  const totalQuotesCount = quotations.length;
  const totalQuotesValue = quotations.reduce((acc, q) => acc + q.totalAmount, 0);

  // Sent / Approved stage
  const approvedOrSentQuotes = quotations.filter(
    (q) => q.status === "approved" || q.status === "sent" || q.isConverted
  );

  // Converted stage
  const convertedQuotes = quotations.filter((q) => q.isConverted);
  const convertedQuotesCount = convertedQuotes.length;
  const convertedQuotesValue = convertedQuotes.reduce((acc, q) => acc + q.totalAmount, 0);

  // Lost stage
  const lostQuotes = quotations.filter((q) => q.isLost);
  const lostQuotesCount = lostQuotes.length;
  const lostQuotesValue = lostQuotes.reduce((acc, q) => acc + q.totalAmount, 0);

  // Rates
  const conversionRateCount =
    totalQuotesCount > 0 ? (convertedQuotesCount / totalQuotesCount) * 100 : 0;
  const conversionRateValue =
    totalQuotesValue > 0 ? (convertedQuotesValue / totalQuotesValue) * 100 : 0;

  // Sales Orders created in period
  const salesOrdersInPeriod = await zohoDb.salesOrder.findMany({
    where: {
      orderDate: { gte: current.start, lte: current.end },
      ...(params.organizationId ? { organizationId: params.organizationId } : {}),
      ...(params.salespersonName && params.salespersonName !== "ALL"
        ? { salespersonName: { contains: params.salespersonName, mode: "insensitive" } }
        : {}),
    },
    select: { totalAmount: true },
  });

  // Invoices created in period
  const invoicesInPeriod = await zohoDb.invoice.findMany({
    where: {
      invoiceDate: { gte: current.start, lte: current.end },
      ...(params.organizationId ? { organizationId: params.organizationId } : {}),
      ...(params.salespersonName && params.salespersonName !== "ALL"
        ? { salespersonName: { contains: params.salespersonName, mode: "insensitive" } }
        : {}),
    },
    select: { totalAmount: true },
  });

  // 2. Conversion Funnel Stages
  const funnelStages = [
    {
      stage: "Quotation Created",
      count: totalQuotesCount,
      value: Math.round(totalQuotesValue),
      percentage: 100,
      description: "All formal quotes submitted",
    },
    {
      stage: "Quotation Approved / Sent",
      count: approvedOrSentQuotes.length,
      value: Math.round(approvedOrSentQuotes.reduce((acc, q) => acc + q.totalAmount, 0)),
      percentage: totalQuotesCount > 0 ? Math.round((approvedOrSentQuotes.length / totalQuotesCount) * 100) : 0,
      description: "Management approved & client-facing",
    },
    {
      stage: "Quotation Converted",
      count: convertedQuotesCount,
      value: Math.round(convertedQuotesValue),
      percentage: totalQuotesCount > 0 ? Math.round((convertedQuotesCount / totalQuotesCount) * 100) : 0,
      description: "Successfully converted to sale",
    },
    {
      stage: "Sales Order Confirmed",
      count: salesOrdersInPeriod.length,
      value: Math.round(salesOrdersInPeriod.reduce((acc, o) => acc + o.totalAmount, 0)),
      percentage: totalQuotesCount > 0 ? Math.round((salesOrdersInPeriod.length / totalQuotesCount) * 100) : 0,
      description: "Booking confirmed in system",
    },
    {
      stage: "Invoice Generated",
      count: invoicesInPeriod.length,
      value: Math.round(invoicesInPeriod.reduce((acc, i) => acc + i.totalAmount, 0)),
      percentage: totalQuotesCount > 0 ? Math.round((invoicesInPeriod.length / totalQuotesCount) * 100) : 0,
      description: "Billing & revenue recognized",
    },
  ];

  // 3. Lost Reasons breakdown
  const lostReasonMap = new Map<string, { count: number; value: number }>();
  for (const lq of lostQuotes) {
    const reason = lq.lostReason || "No Response / Expired";
    const prev = lostReasonMap.get(reason) || { count: 0, value: 0 };
    lostReasonMap.set(reason, { count: prev.count + 1, value: prev.value + lq.totalAmount });
  }

  const lostReasonsBreakdown = Array.from(lostReasonMap.entries()).map(([reason, d]) => ({
    reason,
    count: d.count,
    value: Math.round(d.value),
  }));

  // 4. Lost Quotations detail list
  const lostQuotationsList = lostQuotes.slice(0, 50).map((lq) => ({
    id: lq.id,
    customerName: lq.customerName,
    quotationNumber: lq.quotationNumber,
    quotationValue: lq.totalAmount,
    salespersonName: lq.salespersonName || "Unassigned",
    lostDate: lq.lostDate ? format(lq.lostDate, "yyyy-MM-dd") : format(lq.quotationDate, "yyyy-MM-dd"),
    lostReason: lq.lostReason || "Customer Declined / Expired",
  }));

  return {
    metrics: {
      totalQuotesCount,
      totalQuotesValue: Math.round(totalQuotesValue),
      convertedQuotesCount,
      convertedQuotesValue: Math.round(convertedQuotesValue),
      lostQuotesCount,
      lostQuotesValue: Math.round(lostQuotesValue),
      conversionRateCount: Number(conversionRateCount.toFixed(1)),
      conversionRateValue: Number(conversionRateValue.toFixed(1)),
    },
    funnelStages,
    lostReasonsBreakdown,
    lostQuotationsList,
  };
}
