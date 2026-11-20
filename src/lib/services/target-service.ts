/**
 * Sales Target & Quotation Achievement Service
 * 
 * Fetches salesperson targets from VISIT_DATABASE_URL (Employee & User models),
 * classifies them by Company (TruFlow vs Zeetork),
 * splits annual targets into 12 equal monthly target reports,
 * and links quotation creations from ZOHO_DATABASE_URL to calculate achievement.
 */

import { visitDb } from "../database/visit-db";
import { zohoDb } from "../database/zoho-db";
import { format } from "date-fns";
import {
  TRUFLOW_ORG_ID,
  ZEETORK_ORG_ID,
  TargetQuotationItem,
  MonthlyTargetBreakdown,
  EmployeeTargetData,
  TargetReportParams,
  TargetReportResult,
} from "../types/target";

export * from "../types/target";

const MONTH_NAMES = [
  { short: "Jan", full: "January" },
  { short: "Feb", full: "February" },
  { short: "Mar", full: "March" },
  { short: "Apr", full: "April" },
  { short: "May", full: "May" },
  { short: "Jun", full: "June" },
  { short: "Jul", full: "July" },
  { short: "Aug", full: "August" },
  { short: "Sep", full: "September" },
  { short: "Oct", full: "October" },
  { short: "Nov", full: "November" },
  { short: "Dec", full: "December" },
];

/**
 * Normalizes tokens for resilient salesperson name matching.
 */
function normalizeTokens(name: string): { words: string[]; initials: string[] } {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
  const rawParts = cleaned.split(/\s+/).filter(Boolean);
  const words: string[] = [];
  const initials: string[] = [];
  for (const part of rawParts) {
    if (["mr", "mrs", "ms", "dr"].includes(part)) continue;
    if (part.length === 1) {
      initials.push(part);
    } else {
      words.push(part);
    }
  }
  return { words, initials };
}

/**
 * Matches salesperson names between Visit DB (Employee/User) and Zoho DB (Quotation).
 */
export function matchesSalesperson(empName: string, quoteRepName: string): boolean {
  if (!empName || !quoteRepName) return false;
  const eLower = empName.toLowerCase().trim();
  const qLower = quoteRepName.toLowerCase().trim();
  if (eLower === qLower) return true;

  const e = normalizeTokens(empName);
  const q = normalizeTokens(quoteRepName);

  if (e.words.length === 0 || q.words.length === 0) return false;

  // Exact matched word sequence
  if (e.words.join(" ") === q.words.join(" ")) return true;

  // Multi-word containment (e.g., 'ARUN KUMAR B' and 'Arun Kumar')
  if (e.words.length >= 2 && q.words.length >= 2) {
    const smaller = e.words.length <= q.words.length ? e.words : q.words;
    const larger = e.words.length > q.words.length ? e.words : q.words;
    if (smaller.every((w) => larger.includes(w))) return true;
  }

  // Single distinctive word match (>= 4 characters, e.g. "Gangatharan", "Sabarish", "Ponmudi")
  if (e.words.length >= 1 && q.words.length >= 1) {
    const distinctiveWords = ["gangatharan", "sabarish", "ponmudi", "krishnarajan", "hafeez", "gowtham", "muthukumar", "sakthigowtham", "senthamil"];
    for (const d of distinctiveWords) {
      if (e.words.includes(d) && q.words.includes(d)) {
        return true;
      }
    }
  }

  // Exact initials + single word match (e.g., 'KUMAR N' and 'Kumar N')
  if (e.words.length === 1 && q.words.length === 1 && e.words[0] === q.words[0]) {
    if (e.initials.length === 0 || q.initials.length === 0) return true;
    return e.initials.some((i) => q.initials.includes(i));
  }

  return false;
}

/**
 * Main service method to compute sales targets and 12-month quotation achievements.
 */
export async function getTargetReport(params: TargetReportParams = {}): Promise<TargetReportResult> {
  const currentYear = new Date().getFullYear();
  const year = params.year || currentYear;
  const organizationId = params.organizationId && params.organizationId !== "all" && params.organizationId !== "" 
    ? params.organizationId 
    : undefined;

  const startDate = new Date(year, 0, 1, 0, 0, 0, 0);
  const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

  // 1. Fetch salespersons from Visit DB
  const rawEmployees = await visitDb.employee.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
        },
      },
      companies: {
        include: {
          company: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // 2. Fetch all quotations for the specified year from Zoho DB
  const quoteWhere: any = {
    quotationDate: {
      gte: startDate,
      lte: endDate,
    },
  };
  if (organizationId) {
    quoteWhere.organizationId = organizationId;
  }

  const rawQuotes = await zohoDb.quotation.findMany({
    where: quoteWhere,
    select: {
      id: true,
      quotationNumber: true,
      customerName: true,
      salespersonName: true,
      quotationDate: true,
      totalAmount: true,
      organizationId: true,
      status: true,
    },
    orderBy: { quotationDate: "asc" },
  });

  // Also discover all distinct available years in Zoho quotations for the filter
  const earliestQuote = await zohoDb.quotation.findFirst({
    orderBy: { quotationDate: "asc" },
    select: { quotationDate: true },
  });
  const latestQuote = await zohoDb.quotation.findFirst({
    orderBy: { quotationDate: "desc" },
    select: { quotationDate: true },
  });

  const minYear = earliestQuote ? new Date(earliestQuote.quotationDate).getFullYear() : currentYear;
  const maxYear = latestQuote ? new Date(latestQuote.quotationDate).getFullYear() : currentYear;
  const availableYearsSet = new Set<number>([currentYear]);
  for (let y = minYear; y <= Math.max(maxYear, currentYear); y++) {
    availableYearsSet.add(y);
  }
  const availableYears = Array.from(availableYearsSet).sort((a, b) => b - a);

  // 3. Process each registered employee
  const employeesData: EmployeeTargetData[] = [];
  const assignedQuoteIds = new Set<string>();

  for (const emp of rawEmployees) {
    const empName = emp.user?.name || "Unnamed Employee";
    const empEmail = emp.user?.email || "";
    const empPhone = emp.user?.phone || null;

    // Determine target numbers from DB
    const truflowTarget = Number(emp.truflowTarget || 0);
    const zeetorkTarget = Number(emp.zeetorkTarget || 0);
    const totalTarget = Number(emp.target || (truflowTarget + zeetorkTarget) || 0);

    // Determine company classification
    let classification: "TruFlow" | "Zeetork" | "Both" | "Unassigned" = "Unassigned";
    if (truflowTarget > 0 && zeetorkTarget > 0) {
      classification = "Both";
    } else if (truflowTarget > 0) {
      classification = "TruFlow";
    } else if (zeetorkTarget > 0) {
      classification = "Zeetork";
    } else {
      const companyCodes = emp.companies.map((c) => c.company.code.toUpperCase());
      if (companyCodes.includes("TRU") && companyCodes.includes("ZTK")) {
        classification = "Both";
      } else if (companyCodes.includes("TRU")) {
        classification = "TruFlow";
      } else if (companyCodes.includes("ZTK")) {
        classification = "Zeetork";
      }
    }

    // Determine effective target based on active organization filter
    let effectiveAnnualTarget = totalTarget;
    if (organizationId === TRUFLOW_ORG_ID) {
      effectiveAnnualTarget = truflowTarget;
    } else if (organizationId === ZEETORK_ORG_ID) {
      effectiveAnnualTarget = zeetorkTarget;
    }
    const effectiveMonthlyTarget = Math.round((effectiveAnnualTarget / 12) * 100) / 100;

    // Filter quotations matching this salesperson
    const matchedQuotes = rawQuotes.filter((q) => {
      if (!q.salespersonName) return false;
      return matchesSalesperson(empName, q.salespersonName);
    });

    matchedQuotes.forEach((q) => assignedQuoteIds.add(q.id));

    // Build 12-month breakdown
    const monthsBreakdown: MonthlyTargetBreakdown[] = [];
    let totalAchieved = 0;
    let truflowAchieved = 0;
    let zeetorkAchieved = 0;
    let truflowQuoteCount = 0;
    let zeetorkQuoteCount = 0;

    for (let m = 0; m < 12; m++) {
      const monthIdx = m + 1;
      const monthMeta = MONTH_NAMES[m];
      const monthKey = `${year}-${String(monthIdx).padStart(2, "0")}`;

      const monthQuotes = matchedQuotes.filter((q) => {
        const d = new Date(q.quotationDate);
        return d.getMonth() === m && d.getFullYear() === year;
      });

      const monthTruflowQuotes = monthQuotes.filter((q) => q.organizationId === TRUFLOW_ORG_ID);
      const monthZeetorkQuotes = monthQuotes.filter((q) => q.organizationId === ZEETORK_ORG_ID);

      const mAchieved = monthQuotes.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
      const mTruflowAchieved = monthTruflowQuotes.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
      const mZeetorkAchieved = monthZeetorkQuotes.reduce((acc, q) => acc + (q.totalAmount || 0), 0);

      totalAchieved += mAchieved;
      truflowAchieved += mTruflowAchieved;
      zeetorkAchieved += mZeetorkAchieved;
      truflowQuoteCount += monthTruflowQuotes.length;
      zeetorkQuoteCount += monthZeetorkQuotes.length;

      // Completion rate and variance for this month
      const completionRate = effectiveMonthlyTarget > 0
        ? Math.round((mAchieved / effectiveMonthlyTarget) * 1000) / 10
        : 0;
      const variance = Math.round((mAchieved - effectiveMonthlyTarget) * 100) / 100;

      let status: "achieved" | "on_track" | "behind" | "critical" | "no_target" = "no_target";
      if (effectiveMonthlyTarget > 0) {
        if (completionRate >= 100) status = "achieved";
        else if (completionRate >= 75) status = "on_track";
        else if (completionRate >= 50) status = "behind";
        else status = "critical";
      }

      monthsBreakdown.push({
        monthIndex: monthIdx,
        monthKey,
        monthName: monthMeta.short,
        monthFullName: monthMeta.full,
        target: effectiveMonthlyTarget,
        achieved: Math.round(mAchieved * 100) / 100,
        quotationCount: monthQuotes.length,
        completionRate,
        variance,
        status,
        truflowTarget: Math.round((truflowTarget / 12) * 100) / 100,
        truflowAchieved: Math.round(mTruflowAchieved * 100) / 100,
        truflowQuotationCount: monthTruflowQuotes.length,
        zeetorkTarget: Math.round((zeetorkTarget / 12) * 100) / 100,
        zeetorkAchieved: Math.round(mZeetorkAchieved * 100) / 100,
        zeetorkQuotationCount: monthZeetorkQuotes.length,
        quotations: monthQuotes.map((q) => ({
          id: q.id,
          quotationNumber: q.quotationNumber,
          customerName: q.customerName,
          quotationDate: format(new Date(q.quotationDate), "yyyy-MM-dd"),
          totalAmount: q.totalAmount || 0,
          status: q.status,
          organizationId: q.organizationId,
          companyName: q.organizationId === TRUFLOW_ORG_ID ? "TruFlow" : q.organizationId === ZEETORK_ORG_ID ? "Zeetork" : "Other",
          salespersonName: q.salespersonName || empName,
        })),
      });
    }

    const overallCompletionRate = effectiveAnnualTarget > 0
      ? Math.round((totalAchieved / effectiveAnnualTarget) * 1000) / 10
      : 0;
    const truflowCompletionRate = truflowTarget > 0
      ? Math.round((truflowAchieved / truflowTarget) * 1000) / 10
      : 0;
    const zeetorkCompletionRate = zeetorkTarget > 0
      ? Math.round((zeetorkAchieved / zeetorkTarget) * 1000) / 10
      : 0;

    employeesData.push({
      id: emp.id,
      userId: emp.user?.id,
      name: empName,
      email: empEmail,
      phone: empPhone,
      designation: emp.designation,
      department: emp.department,
      status: emp.status,
      isRegisteredEmployee: true,
      companyClassification: classification,
      annualTarget: effectiveAnnualTarget,
      monthlyTarget: effectiveMonthlyTarget,
      truflowAnnualTarget: truflowTarget,
      truflowMonthlyTarget: Math.round((truflowTarget / 12) * 100) / 100,
      zeetorkAnnualTarget: zeetorkTarget,
      zeetorkMonthlyTarget: Math.round((zeetorkTarget / 12) * 100) / 100,
      companies: emp.companies.map((c) => ({
        id: c.company.id,
        name: c.company.name,
        code: c.company.code,
        target: Number(c.target || 0),
      })),
      totalAchieved: Math.round(totalAchieved * 100) / 100,
      totalQuotationsCount: matchedQuotes.length,
      completionRate: overallCompletionRate,
      variance: Math.round((totalAchieved - effectiveAnnualTarget) * 100) / 100,
      truflowAchieved: Math.round(truflowAchieved * 100) / 100,
      truflowQuotationsCount: truflowQuoteCount,
      truflowCompletionRate,
      zeetorkAchieved: Math.round(zeetorkAchieved * 100) / 100,
      zeetorkQuotationsCount: zeetorkQuoteCount,
      zeetorkCompletionRate,
      months: monthsBreakdown,
    });
  }

  // 4. Optionally process other salespersons in Zoho Quotations without target in Visit DB
  if (params.includeAllSalespersons) {
    const unassignedQuotes = rawQuotes.filter((q) => q.salespersonName && !assignedQuoteIds.has(q.id));
    const extraReps = Array.from(new Set(unassignedQuotes.map((q) => q.salespersonName!.trim())));

    for (const repName of extraReps) {
      const repQuotes = unassignedQuotes.filter((q) => q.salespersonName?.trim() === repName);
      const repTruflowQuotes = repQuotes.filter((q) => q.organizationId === TRUFLOW_ORG_ID);
      const repZeetorkQuotes = repQuotes.filter((q) => q.organizationId === ZEETORK_ORG_ID);

      const monthsBreakdown: MonthlyTargetBreakdown[] = [];
      let totalAchieved = 0;
      let truflowAchieved = 0;
      let zeetorkAchieved = 0;

      for (let m = 0; m < 12; m++) {
        const monthIdx = m + 1;
        const monthMeta = MONTH_NAMES[m];
        const monthKey = `${year}-${String(monthIdx).padStart(2, "0")}`;

        const monthQuotes = repQuotes.filter((q) => {
          const d = new Date(q.quotationDate);
          return d.getMonth() === m && d.getFullYear() === year;
        });

        const monthTruflowQuotes = monthQuotes.filter((q) => q.organizationId === TRUFLOW_ORG_ID);
        const monthZeetorkQuotes = monthQuotes.filter((q) => q.organizationId === ZEETORK_ORG_ID);

        const mAchieved = monthQuotes.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
        const mTruflowAchieved = monthTruflowQuotes.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
        const mZeetorkAchieved = monthZeetorkQuotes.reduce((acc, q) => acc + (q.totalAmount || 0), 0);

        totalAchieved += mAchieved;
        truflowAchieved += mTruflowAchieved;
        zeetorkAchieved += mZeetorkAchieved;

        monthsBreakdown.push({
          monthIndex: monthIdx,
          monthKey,
          monthName: monthMeta.short,
          monthFullName: monthMeta.full,
          target: 0,
          achieved: Math.round(mAchieved * 100) / 100,
          quotationCount: monthQuotes.length,
          completionRate: 0,
          variance: Math.round(mAchieved * 100) / 100,
          status: "no_target",
          truflowTarget: 0,
          truflowAchieved: Math.round(mTruflowAchieved * 100) / 100,
          truflowQuotationCount: monthTruflowQuotes.length,
          zeetorkTarget: 0,
          zeetorkAchieved: Math.round(mZeetorkAchieved * 100) / 100,
          zeetorkQuotationCount: monthZeetorkQuotes.length,
          quotations: monthQuotes.map((q) => ({
            id: q.id,
            quotationNumber: q.quotationNumber,
            customerName: q.customerName,
            quotationDate: format(new Date(q.quotationDate), "yyyy-MM-dd"),
            totalAmount: q.totalAmount || 0,
            status: q.status,
            organizationId: q.organizationId,
            companyName: q.organizationId === TRUFLOW_ORG_ID ? "TruFlow" : q.organizationId === ZEETORK_ORG_ID ? "Zeetork" : "Other",
            salespersonName: repName,
          })),
        });
      }

      employeesData.push({
        id: `zoho-rep-${encodeURIComponent(repName)}`,
        name: repName,
        email: "",
        phone: null,
        designation: "Zoho Salesperson",
        department: "Sales",
        status: "ACTIVE",
        isRegisteredEmployee: false,
        companyClassification: repTruflowQuotes.length > 0 && repZeetorkQuotes.length > 0
          ? "Both"
          : repTruflowQuotes.length > 0
          ? "TruFlow"
          : "Zeetork",
        annualTarget: 0,
        monthlyTarget: 0,
        truflowAnnualTarget: 0,
        truflowMonthlyTarget: 0,
        zeetorkAnnualTarget: 0,
        zeetorkMonthlyTarget: 0,
        companies: [],
        totalAchieved: Math.round(totalAchieved * 100) / 100,
        totalQuotationsCount: repQuotes.length,
        completionRate: 0,
        variance: Math.round(totalAchieved * 100) / 100,
        truflowAchieved: Math.round(truflowAchieved * 100) / 100,
        truflowQuotationsCount: repTruflowQuotes.length,
        truflowCompletionRate: 0,
        zeetorkAchieved: Math.round(zeetorkAchieved * 100) / 100,
        zeetorkQuotationsCount: repZeetorkQuotes.length,
        zeetorkCompletionRate: 0,
        months: monthsBreakdown,
      });
    }
  }

  // Filter specific employee if requested
  let filteredEmployees = employeesData;
  if (params.employeeId) {
    filteredEmployees = employeesData.filter((e) => e.id === params.employeeId || e.name === params.employeeId);
  }

  // 5. Compute Executive Summary KPIs
  const totalAnnualTarget = filteredEmployees.reduce((acc, e) => acc + e.annualTarget, 0);
  const totalMonthlyTarget = filteredEmployees.reduce((acc, e) => acc + e.monthlyTarget, 0);
  const totalAchieved = filteredEmployees.reduce((acc, e) => acc + e.totalAchieved, 0);
  const totalQuotationsCount = filteredEmployees.reduce((acc, e) => acc + e.totalQuotationsCount, 0);
  const overallCompletionRate = totalAnnualTarget > 0
    ? Math.round((totalAchieved / totalAnnualTarget) * 1000) / 10
    : 0;
  const totalVariance = Math.round((totalAchieved - totalAnnualTarget) * 100) / 100;

  const truflowTotalTarget = filteredEmployees.reduce((acc, e) => acc + e.truflowAnnualTarget, 0);
  const truflowTotalAchieved = filteredEmployees.reduce((acc, e) => acc + e.truflowAchieved, 0);
  const truflowCompletionRate = truflowTotalTarget > 0
    ? Math.round((truflowTotalAchieved / truflowTotalTarget) * 1000) / 10
    : 0;

  const zeetorkTotalTarget = filteredEmployees.reduce((acc, e) => acc + e.zeetorkAnnualTarget, 0);
  const zeetorkTotalAchieved = filteredEmployees.reduce((acc, e) => acc + e.zeetorkAchieved, 0);
  const zeetorkCompletionRate = zeetorkTotalTarget > 0
    ? Math.round((zeetorkTotalAchieved / zeetorkTotalTarget) * 1000) / 10
    : 0;

  // Find top performer
  const sortedByAchieved = [...filteredEmployees].sort((a, b) => b.totalAchieved - a.totalAchieved);
  const topPerformer = sortedByAchieved.length > 0 && sortedByAchieved[0].totalAchieved > 0
    ? {
        name: sortedByAchieved[0].name,
        achieved: sortedByAchieved[0].totalAchieved,
        target: sortedByAchieved[0].annualTarget,
        completionRate: sortedByAchieved[0].completionRate,
      }
    : null;

  // 6. Aggregate monthly trend across all filtered employees
  const monthlyTrend = MONTH_NAMES.map((meta, m) => {
    const monthTarget = filteredEmployees.reduce((acc, e) => acc + (e.months[m]?.target || 0), 0);
    const mAchieved = filteredEmployees.reduce((acc, e) => acc + (e.months[m]?.achieved || 0), 0);
    const mTruflow = filteredEmployees.reduce((acc, e) => acc + (e.months[m]?.truflowAchieved || 0), 0);
    const mZeetork = filteredEmployees.reduce((acc, e) => acc + (e.months[m]?.zeetorkAchieved || 0), 0);
    const mQuoteCount = filteredEmployees.reduce((acc, e) => acc + (e.months[m]?.quotationCount || 0), 0);
    const mCompRate = monthTarget > 0 ? Math.round((mAchieved / monthTarget) * 1000) / 10 : 0;

    return {
      monthIndex: m + 1,
      monthName: meta.short,
      target: Math.round(monthTarget * 100) / 100,
      achieved: Math.round(mAchieved * 100) / 100,
      truflowAchieved: Math.round(mTruflow * 100) / 100,
      zeetorkAchieved: Math.round(mZeetork * 100) / 100,
      quotationCount: mQuoteCount,
      completionRate: mCompRate,
    };
  });

  // Find best month
  const sortedMonths = [...monthlyTrend].sort((a, b) => b.achieved - a.achieved);
  const bestMonth = sortedMonths.length > 0 && sortedMonths[0].achieved > 0
    ? {
        monthName: sortedMonths[0].monthName,
        achieved: sortedMonths[0].achieved,
        quotationCount: sortedMonths[0].quotationCount,
      }
    : null;

  let orgName = "All Organizations (TruFlow & Zeetork)";
  if (organizationId === TRUFLOW_ORG_ID) {
    orgName = "TruFlow Solutions";
  } else if (organizationId === ZEETORK_ORG_ID) {
    orgName = "Zeetork Automation";
  }

  return {
    year,
    availableYears,
    organizationId,
    organizationName: orgName,
    summary: {
      totalAnnualTarget: Math.round(totalAnnualTarget * 100) / 100,
      totalMonthlyTarget: Math.round(totalMonthlyTarget * 100) / 100,
      totalAchieved: Math.round(totalAchieved * 100) / 100,
      totalQuotationsCount,
      overallCompletionRate,
      totalVariance,
      truflowTotalTarget: Math.round(truflowTotalTarget * 100) / 100,
      truflowTotalAchieved: Math.round(truflowTotalAchieved * 100) / 100,
      truflowCompletionRate,
      zeetorkTotalTarget: Math.round(zeetorkTotalTarget * 100) / 100,
      zeetorkTotalAchieved: Math.round(zeetorkTotalAchieved * 100) / 100,
      zeetorkCompletionRate,
      topPerformer,
      bestMonth,
    },
    monthlyTrend,
    employees: filteredEmployees,
  };
}
