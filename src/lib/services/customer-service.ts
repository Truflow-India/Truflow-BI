/**
 * Customer Analytics Service
 * Combines Zoho customer master data with Visit Management visits and cross-system correlation.
 */

import { zohoDb } from "../database/zoho-db";
import { visitDb } from "../database/visit-db";
import { PeriodType, getPeriodRange } from "./date-utils";
import { format } from "date-fns";

export interface CustomerFilterParams {
  period?: PeriodType;
  startDate?: string;
  endDate?: string;
  organizationId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getCustomerAnalytics(params: CustomerFilterParams = {}) {
  const periodComp = getPeriodRange(params.period, params.startDate, params.endDate);
  const { current } = periodComp;
  const isAllTime = params.period === "all_time";

  const orgFilter = params.organizationId ? { organizationId: params.organizationId } : {};

  // Build date-bounded where conditions for the selected period
  const quoteWhere: any = {
    ...orgFilter,
    ...(isAllTime ? {} : { quotationDate: { gte: current.start, lte: current.end } }),
  };

  const orderWhere: any = {
    ...orgFilter,
    ...(isAllTime ? {} : { orderDate: { gte: current.start, lte: current.end } }),
  };

  const invoiceWhere: any = {
    ...orgFilter,
    ...(isAllTime ? {} : { invoiceDate: { gte: current.start, lte: current.end } }),
  };

  // 1. Customer master counts
  const totalCustomers = await zohoDb.zohoCustomer.count({
    where: orgFilter,
  });

  const newCustomersInPeriod = await zohoDb.zohoCustomer.count({
    where: {
      ...orgFilter,
      ...(isAllTime ? {} : { createdDate: { gte: current.start, lte: current.end } }),
    },
  });

  // Distinct customers with quotes, orders, invoices IN THE SELECTED PERIOD
  const [quotesByCust, ordersByCust, invoicesByCust] = await Promise.all([
    zohoDb.quotation.groupBy({
      by: ["customerId"],
      where: quoteWhere,
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
    zohoDb.salesOrder.groupBy({
      by: ["customerId"],
      where: orderWhere,
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
    zohoDb.invoice.groupBy({
      by: ["customerId"],
      where: invoiceWhere,
      _count: { id: true },
      _sum: { totalAmount: true, balance: true },
    }),
  ]);

  const customersWithQuotations = quotesByCust.length;
  const customersWithOrders = ordersByCust.length;
  const customersWithInvoices = invoicesByCust.length;

  // Acquisition Funnel for the period
  const acquisitionFunnel = [
    {
      stage: isAllTime ? "Registered Customers" : "Active Master Accounts",
      count: totalCustomers,
      percentage: 100,
    },
    {
      stage: "With Quotations",
      count: customersWithQuotations,
      percentage: totalCustomers > 0 ? Math.round((customersWithQuotations / totalCustomers) * 100) : 0,
    },
    {
      stage: "With Sales Orders",
      count: customersWithOrders,
      percentage: totalCustomers > 0 ? Math.round((customersWithOrders / totalCustomers) * 100) : 0,
    },
    {
      stage: "With Invoices",
      count: customersWithInvoices,
      percentage: totalCustomers > 0 ? Math.round((customersWithInvoices / totalCustomers) * 100) : 0,
    },
  ];

  // Top Customers by Quotation Value IN THE SELECTED PERIOD
  const topQuotesRaw = await zohoDb.quotation.groupBy({
    by: ["customerId", "customerName"],
    where: quoteWhere,
    _sum: { totalAmount: true },
    _count: { id: true },
    orderBy: { _sum: { totalAmount: "desc" } },
    take: 10,
  });

  const topCustomersByQuotation = topQuotesRaw.map((q) => ({
    customerId: q.customerId,
    customerName: q.customerName,
    value: Math.round(q._sum.totalAmount || 0),
    count: q._count.id,
  }));

  // Top Customers by Invoice Value IN THE SELECTED PERIOD
  const topInvoicesRaw = await zohoDb.invoice.groupBy({
    by: ["customerId", "customerName"],
    where: invoiceWhere,
    _sum: { totalAmount: true },
    _count: { id: true },
    orderBy: { _sum: { totalAmount: "desc" } },
    take: 10,
  });

  const topCustomersByInvoice = topInvoicesRaw.map((i) => ({
    customerId: i.customerId,
    customerName: i.customerName,
    value: Math.round(i._sum.totalAmount || 0),
    count: i._count.id,
  }));

  // Map indexes for quick lookup
  const quoteStatsMap = new Map(
    quotesByCust.map((q) => [q.customerId, { count: q._count.id, value: q._sum.totalAmount || 0 }])
  );
  const orderStatsMap = new Map(
    ordersByCust.map((o) => [o.customerId, { count: o._count.id, value: o._sum.totalAmount || 0 }])
  );
  const invStatsMap = new Map(
    invoicesByCust.map((i) => [
      i.customerId,
      { count: i._count.id, value: i._sum.totalAmount || 0, balance: i._sum.balance || 0 },
    ])
  );

  // Paginated customer list
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.max(10, Math.min(100, Number(params.pageSize) || 20));
  const skip = (page - 1) * pageSize;

  const whereClause: any = { ...orgFilter };
  if (params.search) {
    whereClause.OR = [
      { customerName: { contains: params.search, mode: "insensitive" } },
      { companyName: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
      { phone: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [customerRows, totalCount] = await Promise.all([
    zohoDb.zohoCustomer.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      orderBy: { customerName: "asc" },
    }),
    zohoDb.zohoCustomer.count({ where: whereClause }),
  ]);

  // Lookup visit mappings for these customers
  const zohoIds = customerRows.map((c) => c.zohoCustomerId);
  const mappings = await zohoDb.customerMapping.findMany({
    where: { zohoCustomerId: { in: zohoIds } },
  });
  const visitCustMap = new Map(mappings.map((m) => [m.zohoCustomerId, m.visitCustomerId]));

  // Find last visits for these mapped visit customers
  const mappedVisitIds = Array.from(visitCustMap.values());
  const visits = await visitDb.visit.findMany({
    where: { customerId: { in: mappedVisitIds } },
    orderBy: { visitDate: "desc" },
    select: { customerId: true, visitDate: true },
  });

  const lastVisitMap = new Map<string, Date>();
  for (const v of visits) {
    if (!lastVisitMap.has(v.customerId)) {
      lastVisitMap.set(v.customerId, v.visitDate);
    }
  }

  const customers = customerRows.map((c) => {
    const q = quoteStatsMap.get(c.zohoCustomerId) || { count: 0, value: 0 };
    const o = orderStatsMap.get(c.zohoCustomerId) || { count: 0, value: 0 };
    const inv = invStatsMap.get(c.zohoCustomerId) || { count: 0, value: 0, balance: 0 };

    const visitCustId = visitCustMap.get(c.zohoCustomerId);
    const lastVisitDate = visitCustId ? lastVisitMap.get(visitCustId) : null;

    return {
      id: c.id,
      zohoCustomerId: c.zohoCustomerId,
      customerName: c.customerName,
      companyName: c.companyName || "-",
      email: c.email || "-",
      phone: c.phone || c.mobile || "-",
      createdDate: c.createdDate ? format(c.createdDate, "yyyy-MM-dd") : "-",
      quotationCount: q.count,
      quotationValue: Math.round(q.value),
      orderCount: o.count,
      invoiceValue: Math.round(inv.value),
      outstandingBalance: Math.round(inv.balance),
      lastVisitDate: lastVisitDate ? format(lastVisitDate, "yyyy-MM-dd") : "-",
      isMappedToVisitDB: Boolean(visitCustId),
    };
  });

  return {
    kpis: {
      totalCustomers,
      newCustomersInPeriod,
      customersWithQuotations,
      customersWithOrders,
      customersWithInvoices,
    },
    acquisitionFunnel,
    topCustomersByQuotation,
    topCustomersByInvoice,
    periodRange: {
      start: format(current.start, "MMM dd, yyyy"),
      end: format(current.end, "MMM dd, yyyy"),
      isAllTime,
    },
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
    customers,
  };
}
