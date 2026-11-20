/**
 * Finance & Invoice Analytics Service
 * Calculates invoice totals, payment collections, outstanding balances,
 * overdue invoice tracking, aging buckets, and paginated invoice logs.
 */

import { zohoDb } from "../database/zoho-db";
import { PeriodType, getPeriodRange } from "./date-utils";
import { format, differenceInDays } from "date-fns";

export interface FinanceFilterParams {
  period?: PeriodType;
  startDate?: string;
  endDate?: string;
  organizationId?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getFinanceAnalytics(params: FinanceFilterParams = {}) {
  const periodComp = getPeriodRange(params.period, params.startDate, params.endDate);
  const { current } = periodComp;

  const whereClause: any = {
    invoiceDate: { gte: current.start, lte: current.end },
  };

  if (params.organizationId) {
    whereClause.organizationId = params.organizationId;
  }
  if (params.status && params.status !== "ALL") {
    whereClause.status = params.status.toLowerCase();
  }
  if (params.search) {
    whereClause.OR = [
      { invoiceNumber: { contains: params.search, mode: "insensitive" } },
      { customerName: { contains: params.search, mode: "insensitive" } },
      { referenceNumber: { contains: params.search, mode: "insensitive" } },
    ];
  }

  // 1. Fetch Invoices in period
  const invoices = await zohoDb.invoice.findMany({
    where: whereClause,
    select: {
      totalAmount: true,
      balance: true,
      status: true,
      dueDate: true,
      invoiceDate: true,
    },
  });

  const totalInvoices = invoices.length;
  const totalInvoiceValue = invoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
  const totalOutstandingBalance = invoices.reduce((acc, i) => acc + (i.balance || 0), 0);
  const averageInvoiceValue = totalInvoices > 0 ? totalInvoiceValue / totalInvoices : 0;

  // Payments collected in period:
  // Account for payments recorded directly against the period's invoices (totalAmount - balance)
  // as well as any separate payment receipts dated within the period.
  const invoicePaidAmount = invoices.reduce(
    (acc, i) => acc + Math.max(0, (i.totalAmount || 0) - (i.balance || 0)),
    0
  );

  const payments = await zohoDb.payment.findMany({
    where: {
      paymentDate: { gte: current.start, lte: current.end },
      ...(params.organizationId ? { organizationId: params.organizationId } : {}),
    },
    select: { amount: true },
  });
  const paymentReceipts = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const amountCollected = Math.max(invoicePaidAmount, paymentReceipts);

  // Overdue calculations
  const now = new Date();
  const overdueInvoices = invoices.filter(
    (i) => i.balance > 0 && i.dueDate && new Date(i.dueDate) < now
  );
  const overdueValue = overdueInvoices.reduce((acc, i) => acc + i.balance, 0);

  // 2. Receivables Aging buckets
  let agingCurrent = 0; // 0-30 days
  let aging31to60 = 0;
  let aging61to90 = 0;
  let agingOver90 = 0;

  for (const inv of invoices) {
    if (inv.balance > 0) {
      const daysOld = inv.dueDate
        ? differenceInDays(now, new Date(inv.dueDate))
        : differenceInDays(now, new Date(inv.invoiceDate));

      if (daysOld <= 30) {
        agingCurrent += inv.balance;
      } else if (daysOld <= 60) {
        aging31to60 += inv.balance;
      } else if (daysOld <= 90) {
        aging61to90 += inv.balance;
      } else {
        agingOver90 += inv.balance;
      }
    }
  }

  const agingBuckets = [
    { bucket: "Current (0-30d)", amount: Math.round(agingCurrent) },
    { bucket: "31-60 Days", amount: Math.round(aging31to60) },
    { bucket: "61-90 Days", amount: Math.round(aging61to90) },
    { bucket: "90+ Days Overdue", amount: Math.round(agingOver90) },
  ];

  // 3. Status breakdown
  const statusCounts = new Map<string, { count: number; value: number }>();
  for (const inv of invoices) {
    const raw = (inv.status || "draft").toLowerCase();
    const prev = statusCounts.get(raw) || { count: 0, value: 0 };
    statusCounts.set(raw, { count: prev.count + 1, value: prev.value + inv.totalAmount });
  }

  const statusDistribution = Array.from(statusCounts.entries()).map(([status, d]) => ({
    status: status.replace(/_/g, " ").toUpperCase(),
    rawStatus: status,
    count: d.count,
    value: Math.round(d.value),
  }));

  // 4. Paginated invoice list
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.max(10, Math.min(100, Number(params.pageSize) || 20));
  const skip = (page - 1) * pageSize;

  const [tableData, totalCount] = await Promise.all([
    zohoDb.invoice.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      orderBy: { invoiceDate: "desc" },
    }),
    zohoDb.invoice.count({ where: whereClause }),
  ]);

  return {
    kpis: {
      totalInvoices,
      totalInvoiceValue: Math.round(totalInvoiceValue),
      amountCollected: Math.round(amountCollected),
      outstandingBalance: Math.round(totalOutstandingBalance),
      overdueValue: Math.round(overdueValue),
      averageInvoiceValue: Math.round(averageInvoiceValue),
    },
    agingBuckets,
    statusDistribution,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
    invoices: tableData.map((inv) => ({
      id: inv.id,
      zohoInvoiceId: inv.zohoInvoiceId,
      invoiceNumber: inv.invoiceNumber,
      referenceNumber: inv.referenceNumber,
      customerName: inv.customerName,
      salespersonName: inv.salespersonName || "Direct Sales",
      invoiceDate: format(inv.invoiceDate, "yyyy-MM-dd"),
      dueDate: inv.dueDate ? format(inv.dueDate, "yyyy-MM-dd") : "-",
      totalAmount: inv.totalAmount,
      originalAmount: inv.originalAmount,
      balance: inv.balance,
      paidAmount: Math.max(0, inv.totalAmount - inv.balance),
      currencyCode: inv.currencyCode,
      exchangeRate: inv.exchangeRate,
      businessType: inv.businessType,
      isIntercompany: inv.isIntercompany,
      status: inv.status,
      zohoUrl: `https://books.zoho.com/app/${inv.organizationId}#/invoices/${inv.zohoInvoiceId}`,
    })),
  };
}
