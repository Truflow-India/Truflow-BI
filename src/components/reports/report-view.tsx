"use client";

import React, { useState } from "react";
import { ReportData } from "@/lib/services/report-service";
import { formatIndianCurrency, formatCount } from "@/lib/formatters";
import {
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  Clock,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportViewProps {
  initialReport: ReportData;
}

export function ReportView({ initialReport }: ReportViewProps) {
  const [report, setReport] = useState<ReportData>(initialReport);
  const [selectedType, setSelectedType] = useState<string>("this_month");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchReport = async (type: string) => {
    setSelectedType(type);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reports/summary?type=${type}`);
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
      }
    } catch (err) {
      console.error("Failed to load report", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    window.location.href = `/api/reports/export/excel?type=${selectedType}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // 1. Header & Title
    doc.setFillColor(234, 88, 12); // Orange 600
    doc.rect(0, 0, 210, 15, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("TRUFLOW & ZEETORK • EXECUTIVE BUSINESS INTELLIGENCE", 14, 10);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(report.reportTitle, 14, 25);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Period: ${report.periodLabel}  |  Generated: ${report.generatedAt}  |  Sync: ${report.lastSyncTime}`,
      14,
      31
    );

    // 2. Executive KPI Summary Table
    const summaryRows = [
      ["Total Quotations", formatCount(report.executiveSummary.totalQuotations), `${report.comparisons.quotationGrowth}%`],
      ["Total Quotation Value (₹)", formatIndianCurrency(report.executiveSummary.totalQuotationValue), `${report.comparisons.quotationValueGrowth}%`],
      ["Orders Converted", formatCount(report.executiveSummary.ordersConverted), "-"],
      ["Converted Value (₹)", formatIndianCurrency(report.executiveSummary.convertedValue), "-"],
      ["Conversion Rate (%)", `${report.executiveSummary.conversionRate}%`, `${report.comparisons.conversionRateGrowth}%`],
      ["Lost Quotations", formatCount(report.executiveSummary.ordersLost), "-"],
      ["Lost Quotation Value (₹)", formatIndianCurrency(report.executiveSummary.lostValue), "-"],
      ["Sales Orders Generated", formatCount(report.executiveSummary.salesOrdersCount), "-"],
      ["Sales Order Value (₹)", formatIndianCurrency(report.executiveSummary.salesOrdersValue), "-"],
      ["Invoices Generated", formatCount(report.executiveSummary.invoicesCount), "-"],
      ["Total Invoice Value (₹)", formatIndianCurrency(report.executiveSummary.invoicesValue), `${report.comparisons.invoiceValueGrowth}%`],
      ["Payments Collected (₹)", formatIndianCurrency(report.executiveSummary.paymentsCollected), `${report.comparisons.collectedGrowth}%`],
      ["Outstanding Receivables (₹)", formatIndianCurrency(report.executiveSummary.outstandingReceivables), "-"],
      ["New Customers Acquired", formatCount(report.executiveSummary.newCustomers), "-"],
      ["Customer Visits Completed", formatCount(report.executiveSummary.completedVisits), `${report.comparisons.visitGrowth}%`],
    ];

    autoTable(doc, {
      startY: 36,
      head: [["Performance Metric", "Period Figure", "Period Growth"]],
      body: summaryRows,
      theme: "striped",
      headStyles: { fillColor: [234, 88, 12], textColor: 255, fontSize: 8, fontStyle: "bold" },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: "bold" },
        1: { halign: "right" },
        2: { halign: "right" },
      },
    });

    // 3. Salesperson Performance
    let currentY = (doc as any).lastAutoTable.finalY + 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Salesperson Activity & Won Business Scorecard", 14, currentY);

    const repRows = report.salespersonScorecards.map((r) => [
      r.name,
      r.visits,
      r.completedVisits,
      r.quotationsCount,
      formatIndianCurrency(r.quotationsValue),
      r.convertedOrders,
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [["Sales Representative", "Visits", "Completed", "Quotes", "Quoted Value (₹)", "Orders Won"]],
      body: repRows,
      theme: "grid",
      headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2 },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
      },
    });

    // Save
    const filename = `Executive_Report_${report.periodLabel.replace(/\s+/g, "_")}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="space-y-6">
      {/* Control Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        {/* Interval Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => fetchReport("this_week")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedType === "this_week" ? "bg-orange-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => fetchReport("last_week")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedType === "last_week" ? "bg-orange-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Last Week
          </button>
          <button
            onClick={() => fetchReport("this_month")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedType === "this_month" ? "bg-orange-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => fetchReport("last_month")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedType === "last_month" ? "bg-orange-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Last Month
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-xs active:scale-95 transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            Download PDF
          </button>

          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-95 transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Download Excel
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* Main Report Document View (Print-ready) */}
      <div id="printable-report" className="bg-white border border-slate-200 rounded-2xl p-8 space-y-8 shadow-xs print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-bold mb-2">
              <Sparkles className="w-3 h-3 text-orange-600" />
              Official Management Briefing
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">{report.reportTitle}</h2>
            <p className="text-xs text-slate-500 mt-1">
              Reporting Scope: <span className="text-orange-600 font-bold">{report.periodLabel}</span>
            </p>
          </div>

          <div className="text-right text-xs text-slate-500 space-y-0.5">
            <div>Generated: <span className="text-slate-800 font-semibold">{report.generatedAt}</span></div>
            <div>Sync Source: <span className="text-slate-800 font-semibold">Zoho Books & Neon DB</span></div>
            <div>Latest Sync: <span className="text-emerald-600 font-bold">{report.lastSyncTime}</span></div>
          </div>
        </div>

        {/* 1. Executive Summary Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            1. Executive Performance Summary
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Quotations</span>
              <div className="text-lg font-black text-slate-900">{formatCount(report.executiveSummary.totalQuotations)}</div>
              <div className="text-xs font-bold text-orange-600">{formatIndianCurrency(report.executiveSummary.totalQuotationValue)}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Orders Converted</span>
              <div className="text-lg font-black text-emerald-600">{formatCount(report.executiveSummary.ordersConverted)}</div>
              <div className="text-xs font-semibold text-slate-600">{formatIndianCurrency(report.executiveSummary.convertedValue)}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Conversion Rate</span>
              <div className="text-lg font-black text-orange-600">{report.executiveSummary.conversionRate}%</div>
              <div className="text-xs text-slate-400 font-medium">by proposal count</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Sales Orders</span>
              <div className="text-lg font-black text-purple-600">{formatCount(report.executiveSummary.salesOrdersCount)}</div>
              <div className="text-xs font-semibold text-slate-600">{formatIndianCurrency(report.executiveSummary.salesOrdersValue)}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Invoices Generated</span>
              <div className="text-lg font-black text-sky-600">{formatCount(report.executiveSummary.invoicesCount)}</div>
              <div className="text-xs font-semibold text-slate-600">{formatIndianCurrency(report.executiveSummary.invoicesValue)}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Payments Collected</span>
              <div className="text-lg font-black text-emerald-600">{formatIndianCurrency(report.executiveSummary.paymentsCollected)}</div>
              <div className="text-xs text-slate-500 font-medium">Receivables: {formatIndianCurrency(report.executiveSummary.outstandingReceivables)}</div>
            </div>
          </div>
        </div>

        {/* 2. Salesperson Scorecards */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            2. Sales Representative Scorecard
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 bg-slate-50">
                  <th className="py-2.5 px-3 font-bold uppercase text-[11px]">Salesperson</th>
                  <th className="py-2.5 px-3 font-bold uppercase text-[11px] text-right">Total Visits</th>
                  <th className="py-2.5 px-3 font-bold uppercase text-[11px] text-right">Completed</th>
                  <th className="py-2.5 px-3 font-bold uppercase text-[11px] text-right">Quotes Created</th>
                  <th className="py-2.5 px-3 font-bold uppercase text-[11px] text-right">Quoted Value (₹)</th>
                  <th className="py-2.5 px-3 font-bold uppercase text-[11px] text-right">Orders Won</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.salespersonScorecards.map((r) => (
                  <tr key={r.name} className="hover:bg-orange-50/30 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{r.name}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 font-medium">{r.visits}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{r.completedVisits}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-orange-600">{r.quotationsCount}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatIndianCurrency(r.quotationsValue)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{r.convertedOrders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Priority Opportunities & Pending Follow-ups */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* High Priority Opportunities */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              High-Value Open Proposals (&gt; ₹50,000)
            </h3>

            <div className="space-y-2">
              {report.priorityOpportunities.map((opp) => (
                <div key={opp.quotationNumber} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs hover:bg-orange-50/20 transition-colors">
                  <div>
                    <span className="font-bold text-orange-600 block">{opp.quotationNumber}</span>
                    <span className="text-slate-800 truncate max-w-[180px] block font-semibold">{opp.customerName}</span>
                    <span className="text-[10px] text-slate-500 font-medium">Rep: {opp.salespersonName} • Exp: {opp.expiryDate}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-slate-900 text-sm block">{formatIndianCurrency(opp.value)}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200">
                      {opp.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Field Follow-ups */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Pending Follow-ups Requiring Attention
            </h3>

            <div className="space-y-2">
              {report.pendingFollowups.map((f, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1 hover:bg-orange-50/20 transition-colors">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-900 truncate max-w-[200px]">{f.customerName}</span>
                    <span className="text-amber-600 font-bold">{f.followupDate}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between font-medium">
                    <span>Sales Rep: {f.salespersonName}</span>
                    <span className="truncate max-w-[160px] text-slate-400">{f.visitReport}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
