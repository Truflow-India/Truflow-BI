import { NextRequest, NextResponse } from "next/server";
import { generateReportData } from "@/lib/services/report-service";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const periodType = (searchParams.get("type") as any) || "this_month";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const report = await generateReportData(periodType, startDate, endDate);

    // 1. Workbook creation
    const wb = XLSX.utils.book_new();

    // 2. Executive Summary Sheet
    const summaryData = [
      ["Business Performance & Sales Intelligence Report"],
      ["Report Type", report.reportType],
      ["Period", report.periodLabel],
      ["Generated At", report.generatedAt],
      ["Data Sync Time", report.lastSyncTime],
      [],
      ["Key Performance Indicator", "Current Value", "MoM / Period Growth %"],
      ["Total Quotations", report.executiveSummary.totalQuotations, `${report.comparisons.quotationGrowth}%`],
      ["Total Quotation Value (₹)", report.executiveSummary.totalQuotationValue, `${report.comparisons.quotationValueGrowth}%`],
      ["Orders Converted", report.executiveSummary.ordersConverted, "-"],
      ["Converted Quotation Value (₹)", report.executiveSummary.convertedValue, "-"],
      ["Quotation Conversion Rate", `${report.executiveSummary.conversionRate}%`, `${report.comparisons.conversionRateGrowth}%`],
      ["Orders Lost", report.executiveSummary.ordersLost, "-"],
      ["Lost Quotation Value (₹)", report.executiveSummary.lostValue, "-"],
      ["Sales Orders Confirmed", report.executiveSummary.salesOrdersCount, "-"],
      ["Sales Orders Value (₹)", report.executiveSummary.salesOrdersValue, "-"],
      ["Total Invoices Generated", report.executiveSummary.invoicesCount, "-"],
      ["Total Invoice Value (₹)", report.executiveSummary.invoicesValue, `${report.comparisons.invoiceValueGrowth}%`],
      ["Payments Collected (₹)", report.executiveSummary.paymentsCollected, `${report.comparisons.collectedGrowth}%`],
      ["Outstanding Receivables (₹)", report.executiveSummary.outstandingReceivables, "-"],
      ["New Customers Acquired", report.executiveSummary.newCustomers, "-"],
      ["Customer Visits Completed", report.executiveSummary.completedVisits, `${report.comparisons.visitGrowth}%`],
      ["Total Visits Logged", report.executiveSummary.customerVisits, "-"],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary");

    // 3. Salesperson Performance Sheet
    const repHeaders = [
      "Sales Representative",
      "Total Visits",
      "Completed Visits",
      "Quotations Generated",
      "Quotation Value (₹)",
      "Converted Orders",
    ];
    const repRows = report.salespersonScorecards.map((r) => [
      r.name,
      r.visits,
      r.completedVisits,
      r.quotationsCount,
      r.quotationsValue,
      r.convertedOrders,
    ]);
    const wsReps = XLSX.utils.aoa_to_sheet([repHeaders, ...repRows]);
    XLSX.utils.book_append_sheet(wb, wsReps, "Sales Rep Performance");

    // 4. Priority Opportunities Sheet
    const oppHeaders = ["Quotation #", "Customer Name", "Value (₹)", "Sales Rep", "Status", "Expiry Date"];
    const oppRows = report.priorityOpportunities.map((o) => [
      o.quotationNumber,
      o.customerName,
      o.value,
      o.salespersonName,
      o.status,
      o.expiryDate,
    ]);
    const wsOpps = XLSX.utils.aoa_to_sheet([oppHeaders, ...oppRows]);
    XLSX.utils.book_append_sheet(wb, wsOpps, "Priority Opportunities");

    // 5. Pending Follow-ups Sheet
    const followHeaders = ["Customer Name", "Sales Representative", "Follow-up Date", "Last Report Notes"];
    const followRows = report.pendingFollowups.map((f) => [
      f.customerName,
      f.salespersonName,
      f.followupDate,
      f.visitReport,
    ]);
    const wsFollow = XLSX.utils.aoa_to_sheet([followHeaders, ...followRows]);
    XLSX.utils.book_append_sheet(wb, wsFollow, "Pending Follow-ups");

    // Generate buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const filename = `BI_Report_${report.reportType.toLowerCase()}_${report.startDate}_to_${report.endDate}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    console.error("Excel export error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
