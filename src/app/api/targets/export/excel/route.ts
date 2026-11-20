import { NextRequest, NextResponse } from "next/server";
import { getTargetReport } from "@/lib/services/target-service";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const yearStr = searchParams.get("year");
    const organizationId = searchParams.get("organizationId") || undefined;
    const employeeId = searchParams.get("employeeId") || undefined;
    const includeAll = searchParams.get("includeAll") === "true";

    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();

    const report = await getTargetReport({
      year,
      organizationId,
      employeeId,
      includeAllSalespersons: includeAll,
    });

    const wb = XLSX.utils.book_new();

    // 1. Executive Summary Sheet
    const summaryData = [
      ["Sales Target & 12-Month Quotation Achievement Report"],
      ["Year", String(report.year)],
      ["Organization Filter", report.organizationName],
      ["Generated At", new Date().toLocaleString("en-IN")],
      [],
      ["Key Performance Metric", "Value"],
      ["Total Annual Target (₹)", report.summary.totalAnnualTarget],
      ["Average Monthly Target (₹)", report.summary.totalMonthlyTarget],
      ["Total Quotation Value Achieved (₹)", report.summary.totalAchieved],
      ["Total Quotations Created", report.summary.totalQuotationsCount],
      ["Overall Target Achievement Rate", `${report.summary.overallCompletionRate}%`],
      ["Target Variance / Gap (₹)", report.summary.totalVariance],
      ["TruFlow Target (₹)", report.summary.truflowTotalTarget],
      ["TruFlow Achieved (₹)", report.summary.truflowTotalAchieved],
      ["TruFlow Achievement Rate", `${report.summary.truflowCompletionRate}%`],
      ["Zeetork Target (₹)", report.summary.zeetorkTotalTarget],
      ["Zeetork Achieved (₹)", report.summary.zeetorkTotalAchieved],
      ["Zeetork Achievement Rate", `${report.summary.zeetorkCompletionRate}%`],
      ["Top Performer", report.summary.topPerformer ? `${report.summary.topPerformer.name} (₹${report.summary.topPerformer.achieved.toLocaleString("en-IN")})` : "N/A"],
      ["Peak Quotation Month", report.summary.bestMonth ? `${report.summary.bestMonth.monthName} (₹${report.summary.bestMonth.achieved.toLocaleString("en-IN")})` : "N/A"],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Overview");

    // 2. Salesperson Annual Target Sheet
    const repHeaders = [
      "Sales Representative",
      "Designation",
      "Department",
      "Company Classification",
      "Annual Target (₹)",
      "Monthly Target (₹)",
      "TruFlow Target (₹)",
      "Zeetork Target (₹)",
      "Quotation Value Achieved (₹)",
      "TruFlow Achieved (₹)",
      "Zeetork Achieved (₹)",
      "Quotations Created Count",
      "Completion Rate (%)",
      "Variance (₹)",
    ];

    const repRows = report.employees.map((e) => [
      e.name,
      e.designation || "Sales Executive",
      e.department || "Sales",
      e.companyClassification,
      e.annualTarget,
      e.monthlyTarget,
      e.truflowAnnualTarget,
      e.zeetorkAnnualTarget,
      e.totalAchieved,
      e.truflowAchieved,
      e.zeetorkAchieved,
      e.totalQuotationsCount,
      `${e.completionRate}%`,
      e.variance,
    ]);

    const wsReps = XLSX.utils.aoa_to_sheet([repHeaders, ...repRows]);
    XLSX.utils.book_append_sheet(wb, wsReps, "Annual Targets");

    // 3. 12-Month Target & Achievement Matrix Sheet
    const monthCols = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const matrixHeaders = [
      "Sales Representative",
      "Company",
      "Metric",
      ...monthCols,
      "Total / YTD",
    ];

    const matrixRows: any[] = [];
    for (const e of report.employees) {
      // Row 1: Target
      matrixRows.push([
        e.name,
        e.companyClassification,
        "Target (₹)",
        ...e.months.map((m) => m.target),
        e.annualTarget,
      ]);
      // Row 2: Achieved
      matrixRows.push([
        e.name,
        e.companyClassification,
        "Achieved (₹)",
        ...e.months.map((m) => m.achieved),
        e.totalAchieved,
      ]);
      // Row 3: Quotes Count
      matrixRows.push([
        e.name,
        e.companyClassification,
        "Quotes Count",
        ...e.months.map((m) => m.quotationCount),
        e.totalQuotationsCount,
      ]);
      // Row 4: Completion %
      matrixRows.push([
        e.name,
        e.companyClassification,
        "Completion %",
        ...e.months.map((m) => `${m.completionRate}%`),
        `${e.completionRate}%`,
      ]);
    }

    const wsMatrix = XLSX.utils.aoa_to_sheet([matrixHeaders, ...matrixRows]);
    XLSX.utils.book_append_sheet(wb, wsMatrix, "12-Month Matrix");

    // 4. Quotations Drilldown Sheet
    const quoteHeaders = [
      "Quotation Number",
      "Sales Representative",
      "Company / Organization",
      "Customer Name",
      "Quotation Date",
      "Total Amount (₹)",
      "Status",
    ];

    const quoteRows: any[] = [];
    for (const e of report.employees) {
      for (const m of e.months) {
        for (const q of m.quotations) {
          quoteRows.push([
            q.quotationNumber,
            e.name,
            q.companyName,
            q.customerName,
            q.quotationDate,
            q.totalAmount,
            q.status,
          ]);
        }
      }
    }

    const wsQuotes = XLSX.utils.aoa_to_sheet([quoteHeaders, ...quoteRows]);
    XLSX.utils.book_append_sheet(wb, wsQuotes, "Linked Quotations");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Sales_Targets_Report_${year}_${organizationId || "All"}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Failed to export target excel:", error);
    return NextResponse.json(
      { error: "Failed to export Excel report", details: error.message },
      { status: 500 }
    );
  }
}

