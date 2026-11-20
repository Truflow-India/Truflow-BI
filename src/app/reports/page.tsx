import React from "react";
import { generateReportData } from "@/lib/services/report-service";
import { ReportView } from "@/components/reports/report-view";
import { getEffectiveFilters } from "@/lib/filter-utils";
import { FileBarChart2 } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const effective = await getEffectiveFilters(resolved);
  const periodType = (resolved.type as any) || (effective.period as any) || "this_month";
  const initialReport = await generateReportData(
    periodType,
    effective.startDate,
    effective.endDate,
    effective.organizationId
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <FileBarChart2 className="w-6 h-6 text-orange-600" />
          Management Reporting & Document Exports
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Executive performance briefings formatted for C-level review, PDF printing, and Excel analysis
        </p>
      </div>

      <ReportView initialReport={initialReport} />
    </div>
  );
}
