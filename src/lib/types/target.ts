export const TRUFLOW_ORG_ID = process.env.NEXT_PUBLIC_ZOHO_ORG_TRUFLOW || "771755208";
export const ZEETORK_ORG_ID = process.env.NEXT_PUBLIC_ZOHO_ORG_ZEETORK || "876204905";

export interface TargetQuotationItem {
  id: string;
  quotationNumber: string;
  customerName: string;
  quotationDate: string;
  totalAmount: number;
  status: string;
  organizationId: string;
  companyName: "TruFlow" | "Zeetork" | "Other";
  salespersonName: string;
}

export interface MonthlyTargetBreakdown {
  monthIndex: number; // 1 to 12
  monthKey: string; // e.g. "2026-01"
  monthName: string; // "Jan", "Feb", etc.
  monthFullName: string; // "January", "February", etc.
  target: number; // monthly target (Annual / 12)
  achieved: number; // sum of created quotations totalAmount
  quotationCount: number;
  completionRate: number; // percentage (0 - 100+)
  variance: number; // achieved - target
  status: "achieved" | "on_track" | "behind" | "critical" | "no_target";

  truflowTarget: number;
  truflowAchieved: number;
  truflowQuotationCount: number;

  zeetorkTarget: number;
  zeetorkAchieved: number;
  zeetorkQuotationCount: number;

  quotations: TargetQuotationItem[];
}

export interface EmployeeTargetData {
  id: string; // Employee UUID
  userId?: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  department: string | null;
  status: string;
  isRegisteredEmployee: boolean; // true if from Visit DB, false if from Zoho quotation only
  companyClassification: "TruFlow" | "Zeetork" | "Both" | "Unassigned";

  // Targets (Effective based on org filter or combined)
  annualTarget: number;
  monthlyTarget: number;

  // Company specific targets from DB
  truflowAnnualTarget: number;
  truflowMonthlyTarget: number;
  zeetorkAnnualTarget: number;
  zeetorkMonthlyTarget: number;

  companies: Array<{ id: string; name: string; code: string; target: number }>;

  // Yearly totals achieved
  totalAchieved: number;
  totalQuotationsCount: number;
  completionRate: number;
  variance: number;

  truflowAchieved: number;
  truflowQuotationsCount: number;
  truflowCompletionRate: number;

  zeetorkAchieved: number;
  zeetorkQuotationsCount: number;
  zeetorkCompletionRate: number;

  // 12 Months Breakdown
  months: MonthlyTargetBreakdown[];
}

export interface TargetReportParams {
  year?: number;
  organizationId?: string; // '771755208' | '876204905' | undefined
  employeeId?: string; // specific employee ID
  includeAllSalespersons?: boolean; // include Zoho salespersons without targets
}

export interface TargetReportResult {
  year: number;
  availableYears: number[];
  organizationId?: string;
  organizationName: string;

  summary: {
    totalAnnualTarget: number;
    totalMonthlyTarget: number;
    totalAchieved: number;
    totalQuotationsCount: number;
    overallCompletionRate: number;
    totalVariance: number;

    truflowTotalTarget: number;
    truflowTotalAchieved: number;
    truflowCompletionRate: number;

    zeetorkTotalTarget: number;
    zeetorkTotalAchieved: number;
    zeetorkCompletionRate: number;

    topPerformer: {
      name: string;
      achieved: number;
      target: number;
      completionRate: number;
    } | null;

    bestMonth: {
      monthName: string;
      achieved: number;
      quotationCount: number;
    } | null;
  };

  monthlyTrend: Array<{
    monthIndex: number;
    monthName: string;
    target: number;
    achieved: number;
    truflowAchieved: number;
    zeetorkAchieved: number;
    quotationCount: number;
    completionRate: number;
  }>;

  employees: EmployeeTargetData[];
}

