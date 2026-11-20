/**
 * Visit Management Analytics Service
 * Reads from Visit Management Database (Database B - Read-Only),
 * computes visit KPIs, rep performance scorecards, and links verified business conversion.
 */

import { visitDb } from "../database/visit-db";
import { zohoDb } from "../database/zoho-db";
import { PeriodType, getPeriodRange } from "./date-utils";
import { format, endOfWeek, eachWeekOfInterval, subMonths } from "date-fns";

export interface VisitFilterParams {
  period?: PeriodType;
  startDate?: string;
  endDate?: string;
  organizationId?: string;
  employeeId?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getVisitAnalytics(params: VisitFilterParams = {}) {
  const periodComp = getPeriodRange(params.period, params.startDate, params.endDate);
  const { current } = periodComp;

  // 1. Fetch all active employees from Visit DB for the filter dropdown
  const allEmployeesRaw = await visitDb.employee.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const employees = allEmployeesRaw
    .filter((e) => e.user?.name)
    .map((e) => ({
      id: e.id,
      name: e.user.name,
      email: e.user.email,
      designation: e.designation || "Sales Representative",
    }));

  // 2. Fetch all team visits in the period for the Rep Performance Scorecard
  const teamVisitsInPeriod = await visitDb.visit.findMany({
    where: {
      visitDate: { gte: current.start, lte: current.end },
      ...(params.status && params.status !== "ALL" ? { status: params.status } : {}),
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          companyName: true,
        },
      },
      employee: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { visitDate: "desc" },
  });

  // Aggregate scorecard across all salespeople
  const repVisitMap = new Map<
    string,
    {
      employeeId: string;
      name: string;
      email: string;
      totalVisits: number;
      completedVisits: number;
      uniqueCustomers: Set<string>;
    }
  >();

  // Initialize all known active employees in the map so every rep is shown
  for (const emp of employees) {
    repVisitMap.set(emp.id, {
      employeeId: emp.id,
      name: emp.name,
      email: emp.email,
      totalVisits: 0,
      completedVisits: 0,
      uniqueCustomers: new Set<string>(),
    });
  }

  for (const v of teamVisitsInPeriod) {
    const empId = v.employee?.id;
    if (!empId) continue;

    const rep = repVisitMap.get(empId) || {
      employeeId: empId,
      name: v.employee?.user?.name || "Unassigned",
      email: v.employee?.user?.email || "",
      totalVisits: 0,
      completedVisits: 0,
      uniqueCustomers: new Set<string>(),
    };

    rep.totalVisits += 1;
    if (v.status === "COMPLETED") rep.completedVisits += 1;
    rep.uniqueCustomers.add(v.customerId);
    repVisitMap.set(empId, rep);
  }

  const orgFilter = params.organizationId ? { organizationId: params.organizationId } : {};

  // Correlate with Zoho quotes & orders by rep name/email in the period
  const allZohoQuotes = await zohoDb.quotation.findMany({
    where: {
      quotationDate: { gte: current.start, lte: current.end },
      ...orgFilter,
    },
    select: { salespersonName: true, totalAmount: true, isConverted: true },
  });

  const allZohoInvoices = await zohoDb.invoice.findMany({
    where: {
      invoiceDate: { gte: current.start, lte: current.end },
      ...orgFilter,
    },
    select: { salespersonName: true, totalAmount: true },
  });

  const repPerformance = Array.from(repVisitMap.values())
    .map((r) => {
      const repFirstName = r.name.toLowerCase().split(" ")[0];
      const repQuotes = allZohoQuotes.filter(
        (q) =>
          q.salespersonName &&
          (q.salespersonName.toLowerCase().includes(repFirstName) ||
            r.name.toLowerCase().includes(q.salespersonName.toLowerCase().split(" ")[0]))
      );
      const repInvoices = allZohoInvoices.filter(
        (i) =>
          i.salespersonName &&
          (i.salespersonName.toLowerCase().includes(repFirstName) ||
            r.name.toLowerCase().includes(i.salespersonName.toLowerCase().split(" ")[0]))
      );

      const quotationsCount = repQuotes.length;
      const quotationsValue = repQuotes.reduce((acc, q) => acc + q.totalAmount, 0);
      const convertedOrders = repQuotes.filter((q) => q.isConverted).length;
      const invoiceValue = repInvoices.reduce((acc, i) => acc + i.totalAmount, 0);

      return {
        employeeId: r.employeeId,
        name: r.name,
        email: r.email,
        totalVisits: r.totalVisits,
        completedVisits: r.completedVisits,
        uniqueCustomersVisited: r.uniqueCustomers.size,
        quotationsGenerated: quotationsCount,
        quotationValue: Math.round(quotationsValue),
        ordersConverted: convertedOrders,
        invoiceValue: Math.round(invoiceValue),
      };
    })
    .sort((a, b) => b.totalVisits - a.totalVisits);

  // 3. Filtered visits for the specific salesperson (if employeeId is set)
  const isEmployeeFiltered = Boolean(params.employeeId && params.employeeId !== "ALL");
  const filteredVisits = isEmployeeFiltered
    ? teamVisitsInPeriod.filter((v) => v.employee?.id === params.employeeId)
    : teamVisitsInPeriod;

  // Search filter if provided
  const searchedVisits = params.search
    ? filteredVisits.filter((v) => {
        const q = params.search!.toLowerCase();
        const custName = v.customer?.name?.toLowerCase() || "";
        const compName = v.customer?.companyName?.toLowerCase() || "";
        const repName = v.employee?.user?.name?.toLowerCase() || "";
        const notes = v.visitReport?.toLowerCase() || "";
        return custName.includes(q) || compName.includes(q) || repName.includes(q) || notes.includes(q);
      })
    : filteredVisits;

  const totalVisits = filteredVisits.length;
  const completedVisits = filteredVisits.filter((v) => v.status === "COMPLETED").length;
  const pendingVisits = filteredVisits.filter((v) => v.status !== "COMPLETED").length;
  const uniqueCustomerIds = new Set(filteredVisits.map((v) => v.customerId));
  const uniqueCustomersVisited = uniqueCustomerIds.size;
  const followupsRequired = filteredVisits.filter((v) => v.nextFollowupDate !== null).length;
  const followupsCompleted = filteredVisits.filter(
    (v) => v.nextFollowupDate !== null && v.status === "COMPLETED"
  ).length;

  // 4. Visit Outcomes breakdown (reflects filtered salesperson)
  const outcomeMap = new Map<string, number>();
  for (const v of filteredVisits) {
    const outcome = v.visitType || "COLD_VISIT";
    outcomeMap.set(outcome, (outcomeMap.get(outcome) || 0) + 1);
  }
  const visitOutcomes = Array.from(outcomeMap.entries()).map(([outcome, count]) => ({
    outcome: outcome.replace(/_/g, " "),
    count,
  }));

  // 5. Weekly Visit Activity Trend (reflects filtered salesperson)
  const now = new Date();
  const pastEightWeeks = subMonths(now, 2);
  const weekIntervals = eachWeekOfInterval({ start: pastEightWeeks, end: now }, { weekStartsOn: 1 });

  const weeklyActivityTrend = [];
  for (const wStart of weekIntervals) {
    const wEnd = endOfWeek(wStart, { weekStartsOn: 1 });
    const weekWhere: any = { visitDate: { gte: wStart, lte: wEnd } };
    if (isEmployeeFiltered) {
      weekWhere.employeeId = params.employeeId;
    }
    const weekVisits = await visitDb.visit.findMany({
      where: weekWhere,
      select: { status: true },
    });
    weeklyActivityTrend.push({
      period: format(wStart, "dd MMM"),
      week: format(wStart, "dd MMM"),
      completed: weekVisits.filter((v) => v.status === "COMPLETED").length,
      pending: weekVisits.filter((v) => v.status !== "COMPLETED").length,
      total: weekVisits.length,
    });
  }

  // 6. Paginated Visits Table (reflects filtered salesperson & search)
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.max(10, Math.min(100, Number(params.pageSize) || 20));
  const skip = (page - 1) * pageSize;
  const paginatedVisits = searchedVisits.slice(skip, skip + pageSize).map((v) => ({
    id: v.id,
    salespersonName: v.employee?.user?.name || "Unassigned",
    customerName: v.customer?.name || "Unknown",
    companyName: v.customer?.companyName || "-",
    visitDate: format(v.visitDate, "yyyy-MM-dd"),
    visitTime: v.visitTime || "-",
    visitType: v.visitType?.replace(/_/g, " ") || "Cold Visit",
    status: v.status,
    visitReport: v.visitReport || "-",
    nextFollowupDate: v.nextFollowupDate ? format(v.nextFollowupDate, "yyyy-MM-dd") : "-",
  }));

  const selectedEmployee = isEmployeeFiltered
    ? employees.find((e) => e.id === params.employeeId) || null
    : null;

  return {
    kpis: {
      totalVisits,
      completedVisits,
      pendingVisits,
      uniqueCustomersVisited,
      followupsRequired,
      followupsCompleted,
      completionRate: totalVisits > 0 ? Number(((completedVisits / totalVisits) * 100).toFixed(1)) : 0,
    },
    weeklyActivityTrend,
    visitOutcomes,
    repPerformance,
    employees,
    selectedEmployee,
    pagination: {
      page,
      pageSize,
      totalCount: searchedVisits.length,
      totalPages: Math.ceil(searchedVisits.length / pageSize),
    },
    visits: paginatedVisits,
  };
}
