/**
 * Quotation Analytics Service
 * Computes quotation KPIs, conversion rates, status distribution,
 * salesperson breakdown, and provides searchable, paginated quotation listings.
 */

import { zohoDb } from "../database/zoho-db";
import { PeriodType, getPeriodRange } from "./date-utils";
import { format } from "date-fns";

export interface QuotationFilterParams {
  period?: PeriodType;
  startDate?: string;
  endDate?: string;
  search?: string;
  status?: string;
  salespersonName?: string;
  customerId?: string;
  organizationId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export async function getQuotationAnalytics(params: QuotationFilterParams = {}) {
  const periodComp = getPeriodRange(params.period, params.startDate, params.endDate);
  const { current } = periodComp;

  const whereClause: any = {
    quotationDate: { gte: current.start, lte: current.end },
  };

  if (params.organizationId) {
    whereClause.organizationId = params.organizationId;
  }
  if (params.status && params.status !== "ALL") {
    whereClause.status = params.status.toLowerCase();
  }
  if (params.salespersonName && params.salespersonName !== "ALL") {
    whereClause.salespersonName = { contains: params.salespersonName, mode: "insensitive" };
  }
  if (params.customerId) {
    whereClause.customerId = params.customerId;
  }
  if (params.search) {
    whereClause.OR = [
      { quotationNumber: { contains: params.search, mode: "insensitive" } },
      { customerName: { contains: params.search, mode: "insensitive" } },
      { referenceNumber: { contains: params.search, mode: "insensitive" } },
      { salespersonName: { contains: params.search, mode: "insensitive" } },
    ];
  }

  // 1. Summary aggregations
  const allPeriodQuotes = await zohoDb.quotation.findMany({
    where: whereClause,
    select: {
      totalAmount: true,
      status: true,
      isConverted: true,
      isLost: true,
      salespersonName: true,
      quotationDate: true,
    },
  });

  const totalQuotations = allPeriodQuotes.length;
  const totalQuotationValue = allPeriodQuotes.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
  const convertedQuotes = allPeriodQuotes.filter((q) => q.isConverted);
  const lostQuotes = allPeriodQuotes.filter((q) => q.isLost);
  const draftQuotes = allPeriodQuotes.filter((q) => q.status === "draft");
  const approvedQuotes = allPeriodQuotes.filter((q) => q.status === "approved");
  const pendingQuotes = allPeriodQuotes.filter((q) => q.status === "pending_approval");

  const conversionPercentage =
    totalQuotations > 0 ? (convertedQuotes.length / totalQuotations) * 100 : 0;
  const convertedValue = convertedQuotes.reduce((acc, q) => acc + (q.totalAmount || 0), 0);

  // 2. Status distribution
  const statusCounts = new Map<string, { count: number; value: number }>();
  for (const q of allPeriodQuotes) {
    const s = q.status || "other";
    const prev = statusCounts.get(s) || { count: 0, value: 0 };
    statusCounts.set(s, { count: prev.count + 1, value: prev.value + q.totalAmount });
  }

  const statusDistribution = Array.from(statusCounts.entries()).map(([status, d]) => ({
    status: status.replace(/_/g, " ").toUpperCase(),
    rawStatus: status,
    count: d.count,
    value: Math.round(d.value),
  }));

  // 3. Conversion by Salesperson
  const repMap = new Map<
    string,
    { rep: string; totalQuotes: number; totalValue: number; convertedQuotes: number; convertedValue: number }
  >();

  for (const q of allPeriodQuotes) {
    const rep = q.salespersonName || "Unassigned";
    const prev = repMap.get(rep) || {
      rep,
      totalQuotes: 0,
      totalValue: 0,
      convertedQuotes: 0,
      convertedValue: 0,
    };

    prev.totalQuotes += 1;
    prev.totalValue += q.totalAmount;
    if (q.isConverted) {
      prev.convertedQuotes += 1;
      prev.convertedValue += q.totalAmount;
    }
    repMap.set(rep, prev);
  }

  const salespersonPerformance = Array.from(repMap.values())
    .map((r) => ({
      ...r,
      totalValue: Math.round(r.totalValue),
      convertedValue: Math.round(r.convertedValue),
      conversionRate: r.totalQuotes > 0 ? Number(((r.convertedQuotes / r.totalQuotes) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.totalValue - a.totalValue);

  // 4. Paginated records table
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.max(10, Math.min(100, Number(params.pageSize) || 20));
  const skip = (page - 1) * pageSize;
  const sortBy = params.sortBy || "quotationDate";
  const sortOrder = params.sortOrder || "desc";

  const [tableData, totalCount] = await Promise.all([
    zohoDb.quotation.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
    }),
    zohoDb.quotation.count({ where: whereClause }),
  ]);

  return {
    kpis: {
      totalQuotations,
      totalQuotationValue: Math.round(totalQuotationValue),
      convertedQuotations: convertedQuotes.length,
      convertedValue: Math.round(convertedValue),
      conversionPercentage: Number(conversionPercentage.toFixed(1)),
      lostQuotations: lostQuotes.length,
      lostValue: Math.round(lostQuotes.reduce((acc, q) => acc + q.totalAmount, 0)),
      draftQuotations: draftQuotes.length,
      approvedQuotations: approvedQuotes.length,
      pendingApprovalQuotations: pendingQuotes.length,
    },
    statusDistribution,
    salespersonPerformance,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
    quotations: tableData.map((q) => ({
      id: q.id,
      zohoQuotationId: q.zohoQuotationId,
      quotationNumber: q.quotationNumber,
      referenceNumber: q.referenceNumber,
      customerId: q.customerId,
      customerName: q.customerName,
      salespersonName: q.salespersonName || "Unassigned",
      quotationDate: format(q.quotationDate, "yyyy-MM-dd"),
      expiryDate: q.expiryDate ? format(q.expiryDate, "yyyy-MM-dd") : "-",
      totalAmount: q.totalAmount,
      originalAmount: q.originalAmount,
      currencyCode: q.currencyCode,
      exchangeRate: q.exchangeRate,
      businessType: q.businessType,
      isIntercompany: q.isIntercompany,
      status: q.status,
      isConverted: q.isConverted,
      isLost: q.isLost,
      convertedSalesOrderNumber: q.convertedSalesOrderNumber,
      zohoUrl: `https://books.zoho.com/app/${q.organizationId}#/estimates/${q.zohoQuotationId}`,
    })),
  };
}
