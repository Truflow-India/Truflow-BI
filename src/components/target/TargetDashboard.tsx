"use client";

import React, { useState } from "react";
import type {
  TargetReportResult,
  EmployeeTargetData,
  MonthlyTargetBreakdown,
  TargetQuotationItem,
} from "@/lib/types/target";
import { TRUFLOW_ORG_ID, ZEETORK_ORG_ID } from "@/lib/types/target";
import { formatIndianCurrency, formatCount, formatPercentage } from "@/lib/formatters";
import { TargetVsAchievedChart } from "@/components/charts/TargetVsAchievedChart";
import {
  Target,
  Building2,
  Calendar,
  User,
  Users,
  Search,
  Download,
  Printer,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  Filter,
  BarChart3,
  ListFilter,
  Sparkles,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface TargetDashboardProps {
  initialData: TargetReportResult;
}

export function TargetDashboard({ initialData }: TargetDashboardProps) {
  const [data, setData] = useState<TargetReportResult>(initialData);
  const [selectedYear, setSelectedYear] = useState<number>(initialData.year);
  const [selectedOrg, setSelectedOrg] = useState<string>(initialData.organizationId || "");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [includeAll, setIncludeAll] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"cards" | "matrix" | "charts">("cards");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Drilldown Modal State
  const [drilldownModal, setDrilldownModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    quotations: TargetQuotationItem[];
  }>({
    isOpen: false,
    title: "",
    subtitle: "",
    quotations: [],
  });
  const [modalSearch, setModalSearch] = useState<string>("");

  // Expanded employee IDs in matrix view
  const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({});

  const toggleExpand = (empId: string) => {
    setExpandedEmployees((prev) => ({ ...prev, [empId]: !prev[empId] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    data.employees.forEach((e) => (all[e.id] = true));
    setExpandedEmployees(all);
  };

  const collapseAll = () => {
    setExpandedEmployees({});
  };

  // Fetch updated data from API when filters change
  const refreshData = async (
    year: number,
    org: string,
    empId: string,
    allSalespersons: boolean
  ) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("year", String(year));
      if (org && org !== "all") params.set("organizationId", org);
      if (empId) params.set("employeeId", empId);
      if (allSalespersons) params.set("includeAll", "true");

      const res = await fetch(`/api/targets?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load target report:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    refreshData(year, selectedOrg, selectedEmployeeId, includeAll);
  };

  const handleOrgChange = (org: string) => {
    setSelectedOrg(org);
    refreshData(selectedYear, org, selectedEmployeeId, includeAll);
  };

  const handleEmployeeChange = (empId: string) => {
    setSelectedEmployeeId(empId);
    refreshData(selectedYear, selectedOrg, empId, includeAll);
  };

  const handleScopeToggle = (checked: boolean) => {
    setIncludeAll(checked);
    refreshData(selectedYear, selectedOrg, selectedEmployeeId, checked);
  };

  // Download Excel
  const handleDownloadExcel = () => {
    const params = new URLSearchParams();
    params.set("year", String(selectedYear));
    if (selectedOrg && selectedOrg !== "all") params.set("organizationId", selectedOrg);
    if (selectedEmployeeId) params.set("employeeId", selectedEmployeeId);
    if (includeAll) params.set("includeAll", "true");
    window.location.href = `/api/targets/export/excel?${params.toString()}`;
  };

  // Print View
  const handlePrint = () => {
    window.print();
  };

  // Download PDF Report
  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Header banner
    doc.setFillColor(234, 88, 12);
    doc.rect(0, 0, 297, 14, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("TRUFLOW & ZEETORK • ANNUAL TARGET & 12-MONTH QUOTATION REPORT", 14, 9.5);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text(`Sales Targets & 12-Month Performance Report (${data.year})`, 14, 23);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Organization: ${data.organizationName}  |  Generated: ${new Date().toLocaleDateString("en-IN")}  |  Target Achievement: ${data.summary.overallCompletionRate}%`,
      14,
      29
    );

    // Summary table
    autoTable(doc, {
      startY: 33,
      head: [
        [
          "Total Annual Target",
          "Average Monthly Target",
          "Total Quotations Achieved",
          "Quotations Created",
          "Overall Completion %",
          "TruFlow Target / Achieved",
          "Zeetork Target / Achieved",
        ],
      ],
      body: [
        [
          formatIndianCurrency(data.summary.totalAnnualTarget),
          formatIndianCurrency(data.summary.totalMonthlyTarget),
          formatIndianCurrency(data.summary.totalAchieved),
          String(data.summary.totalQuotationsCount),
          `${data.summary.overallCompletionRate}%`,
          `${formatIndianCurrency(data.summary.truflowTotalTarget)} / ${formatIndianCurrency(data.summary.truflowTotalAchieved)}`,
          `${formatIndianCurrency(data.summary.zeetorkTotalTarget)} / ${formatIndianCurrency(data.summary.zeetorkTotalAchieved)}`,
        ],
      ],
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold", fontSize: 7.5 },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      theme: "grid",
    });

    // Employee table
    const lastY = (doc as any).lastAutoTable?.finalY || 45;
    const repHeaders = [
      "Sales Representative",
      "Company",
      "Annual Target",
      "Monthly Target (1/12)",
      "Total Achieved",
      "Quotes Count",
      "Completion %",
      "Variance",
    ];

    const repRows = data.employees.map((e) => [
      e.name,
      e.companyClassification,
      formatIndianCurrency(e.annualTarget),
      formatIndianCurrency(e.monthlyTarget),
      formatIndianCurrency(e.totalAchieved),
      String(e.totalQuotationsCount),
      `${e.completionRate}%`,
      formatIndianCurrency(e.variance),
    ]);

    autoTable(doc, {
      startY: lastY + 6,
      head: [repHeaders],
      body: repRows,
      headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: "striped",
    });

    doc.save(`Sales_Targets_Report_${data.year}_${data.organizationId || "All"}.pdf`);
  };

  // Filter employees by search query
  const displayEmployees = data.employees.filter((emp) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      emp.name.toLowerCase().includes(q) ||
      (emp.designation && emp.designation.toLowerCase().includes(q)) ||
      emp.companyClassification.toLowerCase().includes(q)
    );
  });

  // Open quotation drilldown modal
  const openDrilldown = (
    title: string,
    subtitle: string,
    quotations: TargetQuotationItem[]
  ) => {
    setDrilldownModal({
      isOpen: true,
      title,
      subtitle,
      quotations,
    });
    setModalSearch("");
  };

  const filteredModalQuotations = drilldownModal.quotations.filter((q) => {
    if (!modalSearch) return true;
    const s = modalSearch.toLowerCase();
    return (
      q.quotationNumber.toLowerCase().includes(s) ||
      q.customerName.toLowerCase().includes(s) ||
      q.status.toLowerCase().includes(s) ||
      q.salespersonName.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-orange-100/70 text-orange-600">
              <Target className="w-6 h-6" />
            </span>
            Sales Targets & 12-Month Quotation Report
          </h1>
        </div>

        {/* Action Controls: Export & Print */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title="Download Excel Spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export Excel
          </button>
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title="Download PDF Summary"
          >
            <Download className="w-4 h-4 text-slate-600" />
            Download PDF
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title="Print Report"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            Print
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Organization Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Company / Organization
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500">
              <Building2 className="w-4 h-4 text-orange-600 flex-shrink-0" />
              <select
                value={selectedOrg}
                onChange={(e) => handleOrgChange(e.target.value)}
                className="w-full bg-transparent font-medium focus:outline-none cursor-pointer"
              >
                <option value="">All Companies (TruFlow &amp; Zeetork)</option>
                <option value={TRUFLOW_ORG_ID}>TruFlow Solutions (INR)</option>
                <option value={ZEETORK_ORG_ID}>Zeetork Automation (INR)</option>
              </select>
            </div>
          </div>

          {/* Year Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Target Year
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500">
              <Calendar className="w-4 h-4 text-orange-600 flex-shrink-0" />
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
                className="w-full bg-transparent font-medium focus:outline-none cursor-pointer"
              >
                {data.availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Year {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Salesperson Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Filter By Salesperson
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500">
              <User className="w-4 h-4 text-orange-600 flex-shrink-0" />
              <select
                value={selectedEmployeeId}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                className="w-full bg-transparent font-medium focus:outline-none cursor-pointer truncate"
              >
                <option value="">All Sales Representatives</option>
                {data.employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.companyClassification})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Search */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Search Salespersons
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search name, role, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent font-medium focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Second Row: Scope Toggle & Loading Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeAll}
              onChange={(e) => handleScopeToggle(e.target.checked)}
              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
            />
            <span className="font-semibold text-slate-700">
              Include all Zoho sales representatives
            </span>
            <span className="text-[11px] text-slate-400">
              (shows other active reps who have quotation creations in Zoho)
            </span>
          </label>

          {isLoading && (
            <div className="flex items-center gap-1.5 text-orange-600 font-semibold animate-pulse text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              Updating target report...
            </div>
          )}
        </div>
      </div>

      {/* Top Executive KPI Cards */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Total Annual Target
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatIndianCurrency(data.summary.totalAnnualTarget)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Monthly Run-Rate: <span className="font-bold text-slate-700">{formatIndianCurrency(data.summary.totalMonthlyTarget)}/mo</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Quotation Value Achieved
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            {formatIndianCurrency(data.summary.totalAchieved)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Across <span className="font-bold text-slate-700">{formatCount(data.summary.totalQuotationsCount)}</span> Quotations Created
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Target Completion
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-900">
              {formatPercentage(data.summary.overallCompletionRate)}
            </span>
            <span className="text-[11px] text-slate-500">of Annual Goal</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2.5 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                data.summary.overallCompletionRate >= 100
                  ? "bg-emerald-500"
                  : data.summary.overallCompletionRate >= 50
                  ? "bg-orange-500"
                  : "bg-amber-500"
              }`}
              style={{ width: `${Math.min(100, data.summary.overallCompletionRate)}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Company Target Split
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-orange-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-600"></span>
                TruFlow:
              </span>
              <span className="font-bold text-slate-800">
                {formatIndianCurrency(data.summary.truflowTotalTarget)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-sky-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                Zeetork:
              </span>
              <span className="font-bold text-slate-800">
                {formatIndianCurrency(data.summary.zeetorkTotalTarget)}
              </span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 border-t border-slate-100 pt-1">
            TruFlow: {formatIndianCurrency(data.summary.truflowTotalAchieved)} | Zeetork: {formatIndianCurrency(data.summary.zeetorkTotalAchieved)}
          </div>
        </div>
      </div> */}

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("cards")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "cards"
                ? "bg-orange-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Users className="w-4 h-4" />
            Salesperson Cards ({displayEmployees.length})
          </button>

          <button
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "matrix"
                ? "bg-orange-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ListFilter className="w-4 h-4" />
            12-Month Matrix Report
          </button>

          <button
            onClick={() => setActiveTab("charts")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "charts"
                ? "bg-orange-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Trend &amp; Analytics
          </button>
        </div>

        {activeTab === "matrix" && (
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <button
              onClick={expandAll}
              className="text-orange-600 hover:text-orange-700 font-semibold cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={collapseAll}
              className="text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: SALESPERSON CARDS */}
      {activeTab === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {displayEmployees.map((emp) => {
            const hasTarget = emp.annualTarget > 0;
            const completion = emp.completionRate;

            return (
              <div
                key={emp.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Card Header with Classification Badge */}
                  <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-white flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        {emp.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {emp.designation || "Sales Representative"} • {emp.department || "Sales"}
                      </p>
                    </div>

                    {/* Company Classification Tag */}
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex-shrink-0 ${
                        emp.companyClassification === "TruFlow"
                          ? "bg-orange-100 text-orange-700 border border-orange-200"
                          : emp.companyClassification === "Zeetork"
                          ? "bg-sky-100 text-sky-700 border border-sky-200"
                          : emp.companyClassification === "Both"
                          ? "bg-purple-100 text-purple-700 border border-purple-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {emp.companyClassification === "Both" ? "TruFlow & Zeetork" : emp.companyClassification}
                    </span>
                  </div>

                  {/* Card Body: Targets & Achievement */}
                  <div className="p-5 space-y-4">
                    {/* Annual & Monthly Target */}
                    <div className="grid grid-cols-2 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Annual Target
                        </span>
                        <div className="text-base font-black text-slate-900 mt-0.5">
                          {formatIndianCurrency(emp.annualTarget)}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Monthly Target (1/12)
                        </span>
                        <div className="text-base font-black text-slate-700 mt-0.5">
                          {formatIndianCurrency(emp.monthlyTarget)}
                        </div>
                      </div>
                    </div>

                    {/* Quotation Creation Achieved */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-500 font-medium">Quotations Created Value:</span>
                        <span className="font-black text-emerald-600 text-sm">
                          {formatIndianCurrency(emp.totalAchieved)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                        <span>Total Quotes Created:</span>
                        <span className="font-bold text-slate-700">{formatCount(emp.totalQuotationsCount)}</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Progress</span>
                          <span className="font-bold text-slate-800">
                            {hasTarget ? `${completion}%` : "No Target Set"}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              completion >= 100
                                ? "bg-emerald-500"
                                : completion >= 50
                                ? "bg-orange-500"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${Math.min(100, completion)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Breakdown by Company if applicable */}
                    {(emp.truflowAnnualTarget > 0 || emp.zeetorkAnnualTarget > 0) && (
                      <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">TruFlow Target / Achieved:</span>
                          <span className="font-bold text-slate-700">
                            {formatIndianCurrency(emp.truflowAnnualTarget)} / {formatIndianCurrency(emp.truflowAchieved)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Zeetork Target / Achieved:</span>
                          <span className="font-bold text-slate-700">
                            {formatIndianCurrency(emp.zeetorkAnnualTarget)} / {formatIndianCurrency(emp.zeetorkAchieved)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Quick Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => {
                      const allQuotes = emp.months.flatMap((m) => m.quotations);
                      openDrilldown(
                        `${emp.name} - Quotations (${data.year})`,
                        `Total Achieved: ${formatIndianCurrency(emp.totalAchieved)} across ${emp.totalQuotationsCount} quotation(s)`,
                        allQuotes
                      );
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View {emp.totalQuotationsCount} Quotes
                  </button>

                  <button
                    onClick={() => {
                      toggleExpand(emp.id);
                      setActiveTab("matrix");
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    12-Month Table
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: 12-MONTH MATRIX REPORT */}
      {activeTab === "matrix" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                12-Month Performance Matrix ({data.year})
              </h3>
              <p className="text-[11px] text-slate-500">
                Annual target split into 12 equal months. Click on any month cell or employee row to drill into quotations.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Achieved (≥100%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> On Track (≥75%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Behind (≥50%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span> Critical (&lt;50%)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[200px] sticky left-0 bg-slate-100 z-10">Sales Representative</th>
                  <th className="py-3 px-3">Company</th>
                  <th className="py-3 px-3 text-right">Annual Target</th>
                  <th className="py-3 px-3 text-right">Monthly (1/12)</th>
                  {data.monthlyTrend.map((m) => (
                    <th key={m.monthIndex} className="py-3 px-3 text-center min-w-[90px]">
                      {m.monthName}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right min-w-[120px] bg-slate-100">Total Achieved</th>
                  <th className="py-3 px-4 text-center min-w-[90px] bg-slate-100">Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayEmployees.map((emp) => {
                  const isExpanded = expandedEmployees[emp.id];

                  return (
                    <React.Fragment key={emp.id}>
                      {/* Main Employee Row */}
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 sticky left-0 bg-white hover:bg-slate-50 z-10">
                          <button
                            onClick={() => toggleExpand(emp.id)}
                            className="flex items-center gap-2 text-left hover:text-orange-600 cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                            <div>
                              <div>{emp.name}</div>
                              <div className="text-[10px] font-normal text-slate-400">{emp.designation || "Sales"}</div>
                            </div>
                          </button>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              emp.companyClassification === "TruFlow"
                                ? "bg-orange-50 text-orange-700"
                                : emp.companyClassification === "Zeetork"
                                ? "bg-sky-50 text-sky-700"
                                : emp.companyClassification === "Both"
                                ? "bg-purple-50 text-purple-700"
                                : "bg-slate-50 text-slate-600"
                            }`}
                          >
                            {emp.companyClassification}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right font-semibold text-slate-800">
                          {formatIndianCurrency(emp.annualTarget)}
                        </td>

                        <td className="py-3 px-3 text-right text-slate-600 font-medium">
                          {formatIndianCurrency(emp.monthlyTarget)}
                        </td>

                        {/* 12 Months cells */}
                        {emp.months.map((m) => {
                          const hasAchieved = m.achieved > 0;
                          return (
                            <td
                              key={m.monthIndex}
                              onClick={() => {
                                if (m.quotations.length > 0) {
                                  openDrilldown(
                                    `${emp.name} - ${m.monthFullName} ${data.year}`,
                                    `Target: ${formatIndianCurrency(m.target)}  |  Achieved: ${formatIndianCurrency(m.achieved)} (${m.completionRate}%)`,
                                    m.quotations
                                  );
                                }
                              }}
                              className={`py-2 px-2 text-center transition-colors ${
                                m.quotations.length > 0 ? "cursor-pointer hover:bg-orange-50" : ""
                              }`}
                            >
                              <div className="flex flex-col items-center">
                                <span
                                  className={`font-semibold ${
                                    hasAchieved ? "text-emerald-700 font-bold" : "text-slate-400"
                                  }`}
                                >
                                  {hasAchieved ? formatIndianCurrency(m.achieved) : "-"}
                                </span>
                                {emp.monthlyTarget > 0 && hasAchieved && (
                                  <span
                                    className={`text-[9px] font-bold px-1 rounded ${
                                      m.completionRate >= 100
                                        ? "bg-emerald-100 text-emerald-800"
                                        : m.completionRate >= 75
                                        ? "bg-orange-100 text-orange-800"
                                        : m.completionRate >= 50
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {m.completionRate}%
                                  </span>
                                )}
                                {m.quotationCount > 0 && (
                                  <span className="text-[9px] text-slate-400">
                                    {m.quotationCount} {m.quotationCount === 1 ? "quote" : "quotes"}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Total Achieved & Completion Rate */}
                        <td className="py-3 px-4 text-right font-black text-emerald-600 bg-slate-50/70">
                          {formatIndianCurrency(emp.totalAchieved)}
                        </td>

                        <td className="py-3 px-4 text-center bg-slate-50/70">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                              emp.annualTarget > 0
                                ? emp.completionRate >= 100
                                  ? "bg-emerald-100 text-emerald-800"
                                  : emp.completionRate >= 50
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {emp.annualTarget > 0 ? `${emp.completionRate}%` : "N/A"}
                          </span>
                        </td>
                      </tr>

                      {/* Expandable Detailed 12-Month Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={17} className="p-4 border-y border-slate-200">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                                  {emp.name} — Monthly Breakdown &amp; Company Targets
                                </h4>
                                <button
                                  onClick={() => {
                                    const allQuotes = emp.months.flatMap((m) => m.quotations);
                                    openDrilldown(
                                      `${emp.name} - All Quotations (${data.year})`,
                                      `Total Achieved: ${formatIndianCurrency(emp.totalAchieved)} across ${emp.totalQuotationsCount} quotation(s)`,
                                      allQuotes
                                    );
                                  }}
                                  className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  View All {emp.totalQuotationsCount} Quotations
                                </button>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">TruFlow Target</span>
                                  <div className="font-bold text-slate-900 mt-0.5">
                                    {formatIndianCurrency(emp.truflowAnnualTarget)} (Achieved: {formatIndianCurrency(emp.truflowAchieved)})
                                  </div>
                                </div>
                                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Zeetork Target</span>
                                  <div className="font-bold text-slate-900 mt-0.5">
                                    {formatIndianCurrency(emp.zeetorkAnnualTarget)} (Achieved: {formatIndianCurrency(emp.zeetorkAchieved)})
                                  </div>
                                </div>
                                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Target Variance / Gap</span>
                                  <div className={`font-bold mt-0.5 ${emp.variance >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                                    {formatIndianCurrency(emp.variance)}
                                  </div>
                                </div>
                                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Email &amp; Phone</span>
                                  <div className="font-bold text-slate-700 mt-0.5 truncate">
                                    {emp.email || "No email"} {emp.phone ? `• ${emp.phone}` : ""}
                                  </div>
                                </div>
                              </div>

                              {/* Mini Chart for this employee */}
                              <div className="pt-2">
                                <TargetVsAchievedChart
                                  data={emp.months.map((m) => ({
                                    monthIndex: m.monthIndex,
                                    monthName: m.monthName,
                                    target: m.target,
                                    achieved: m.achieved,
                                    quotationCount: m.quotationCount,
                                    completionRate: m.completionRate,
                                  }))}
                                  title={`${emp.name} — Monthly Target vs Quotations Achieved`}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Total Summary Row */}
                <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                  <td className="py-3 px-4 sticky left-0 bg-slate-100 z-10">TOTAL (All Salespersons)</td>
                  <td className="py-3 px-3">-</td>
                  <td className="py-3 px-3 text-right">{formatIndianCurrency(data.summary.totalAnnualTarget)}</td>
                  <td className="py-3 px-3 text-right">{formatIndianCurrency(data.summary.totalMonthlyTarget)}</td>
                  {data.monthlyTrend.map((m) => (
                    <td key={m.monthIndex} className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-emerald-700">{formatIndianCurrency(m.achieved)}</span>
                        {m.quotationCount > 0 && (
                          <span className="text-[9px] text-slate-500 font-normal">{m.quotationCount} quotes</span>
                        )}
                      </div>
                    </td>
                  ))}
                  <td className="py-3 px-4 text-right text-emerald-600 font-black bg-slate-200/60">
                    {formatIndianCurrency(data.summary.totalAchieved)}
                  </td>
                  <td className="py-3 px-4 text-center bg-slate-200/60 font-black">
                    {data.summary.overallCompletionRate}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TREND & ANALYTICS CHARTS */}
      {activeTab === "charts" && (
        <div className="space-y-6">
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Company-Wide Target vs Quotations Achieved ({data.year})
                </h3>
                <p className="text-xs text-slate-500">
                  12-month run-rate comparing aggregated monthly targets against quotations created
                </p>
              </div>
            </div>

            <TargetVsAchievedChart
              data={data.monthlyTrend}
              showCompanySplit={!selectedOrg || selectedOrg === "all"}
            />
          </div>

          {/* Highlights & Top Performers Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-orange-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Top Performing Salesperson
                </h4>
              </div>
              {data.summary.topPerformer ? (
                <div>
                  <div className="text-lg font-black text-slate-900">
                    {data.summary.topPerformer.name}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Quotation Value:{" "}
                    <span className="font-black text-emerald-600">
                      {formatIndianCurrency(data.summary.topPerformer.achieved)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">No quotation performance logged for this period</div>
              )}
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-orange-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Peak Quotation Month
                </h4>
              </div>
              {data.summary.bestMonth ? (
                <div>
                  <div className="text-lg font-black text-slate-900">
                    {data.summary.bestMonth.monthName} ({data.year})
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Value Achieved:{" "}
                    <span className="font-black text-emerald-600">
                      {formatIndianCurrency(data.summary.bestMonth.achieved)}
                    </span>{" "}
                    across {data.summary.bestMonth.quotationCount} quotations
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">No quotation activity logged for this period</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUOTATION DRILL-DOWN MODAL */}
      {drilldownModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{drilldownModal.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{drilldownModal.subtitle}</p>
              </div>
              <button
                onClick={() => setDrilldownModal({ isOpen: false, title: "", subtitle: "", quotations: [] })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Filter Bar */}
            <div className="p-3 border-b border-slate-100 bg-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by quote #, customer, status..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full bg-transparent focus:outline-none"
                />
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Showing {filteredModalQuotations.length} of {drilldownModal.quotations.length} quotation(s)
              </div>
            </div>

            {/* Modal Table Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredModalQuotations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No quotations matched the search filter
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                      <th className="py-2.5 px-3">Quotation #</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Company</th>
                      <th className="py-2.5 px-3">Salesperson</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredModalQuotations.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-orange-600">{q.quotationNumber}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{q.customerName}</td>
                        <td className="py-2.5 px-3 text-slate-500">{q.quotationDate}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              q.companyName === "TruFlow"
                                ? "bg-orange-50 text-orange-700"
                                : "bg-sky-50 text-sky-700"
                            }`}
                          >
                            {q.companyName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{q.salespersonName}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize">
                            {q.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">
                          {formatIndianCurrency(q.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Total Quotation Sum:{" "}
                <span className="font-bold text-slate-900">
                  {formatIndianCurrency(
                    filteredModalQuotations.reduce((acc, q) => acc + q.totalAmount, 0)
                  )}
                </span>
              </span>
              <button
                onClick={() => setDrilldownModal({ isOpen: false, title: "", subtitle: "", quotations: [] })}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
