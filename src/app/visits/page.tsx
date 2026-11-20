import React from "react";
import { getVisitAnalytics, VisitFilterParams } from "@/lib/services/visit-service";
import { formatIndianCurrency, formatCount } from "@/lib/formatters";
import { VisitActivityChart } from "@/components/charts/VisitActivityChart";
import { SelectFilter } from "@/components/ui/select-filter";
import { getEffectiveFilters } from "@/lib/filter-utils";
import {
  MapPin,
  Award,
  User,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function VisitAnalyticsPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const effective = await getEffectiveFilters(resolved);

  const filterParams: VisitFilterParams = {
    period: effective.period as any,
    startDate: effective.startDate,
    endDate: effective.endDate,
    employeeId: resolved.employeeId,
    status: resolved.status,
    search: resolved.search,
    page: resolved.page ? parseInt(resolved.page, 10) : 1,
    pageSize: resolved.pageSize ? parseInt(resolved.pageSize, 10) : 25,
  };

  const data = await getVisitAnalytics(filterParams);
  const { kpis, weeklyActivityTrend, visitOutcomes, repPerformance, employees, selectedEmployee, visits, pagination } = data;

  const isFilteredByRep = Boolean(filterParams.employeeId && filterParams.employeeId !== "ALL");

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-orange-600" />
            Field Visit & Sales Rep Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Direct feed from Visit Management Database (Neon PostgreSQL) correlated with Zoho quotation and deal generation
          </p>
        </div>

        {isFilteredByRep && selectedEmployee && (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200">
            <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
            <span className="text-xs font-bold text-orange-900">
              Active Rep: <span className="text-orange-600">{selectedEmployee.name}</span>
            </span>
            <Link
              href={`/visits?period=${filterParams.period}${filterParams.organizationId ? `&organizationId=${filterParams.organizationId}` : ""}`}
              className="ml-1 text-[11px] font-semibold text-orange-700 hover:text-orange-900 underline"
            >
              Clear
            </Link>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Visits</span>
          <div className="text-xl font-black text-slate-900">{formatCount(kpis.totalVisits)}</div>
          <div className="text-[11px] text-slate-400">
            {isFilteredByRep ? "By selected rep" : "Scheduled / logged"}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed Visits</span>
          <div className="text-xl font-black text-emerald-600">{formatCount(kpis.completedVisits)}</div>
          <div className="text-[11px] text-emerald-600 font-semibold">{kpis.completionRate}% completion</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Visits</span>
          <div className="text-xl font-black text-amber-600">{formatCount(kpis.pendingVisits)}</div>
          <div className="text-[11px] text-slate-400">Follow-up needed</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unique Clients Visited</span>
          <div className="text-xl font-black text-orange-600">{formatCount(kpis.uniqueCustomersVisited)}</div>
          <div className="text-[11px] text-slate-400">Client coverage</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Follow-ups Required</span>
          <div className="text-xl font-black text-slate-900">{formatCount(kpis.followupsRequired)}</div>
          <div className="text-[11px] text-slate-400">Scheduled meetings</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-xs hover:border-orange-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Follow-ups Closed</span>
          <div className="text-xl font-black text-purple-600">{formatCount(kpis.followupsCompleted)}</div>
          <div className="text-[11px] text-slate-400">Completed touchpoints</div>
        </div>
      </div>

      {/* Salesperson Performance Scorecard (Combined with Zoho quotes & revenue) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-orange-600" />
              Sales Representative Performance Scorecard
            </h3>
            <p className="text-xs text-slate-500">
              Cross-system audit evaluating field visit cadence alongside formal quotation and order conversion results
            </p>
          </div>

          {isFilteredByRep && (
            <Link
              href={`/visits?period=${filterParams.period}${filterParams.organizationId ? `&organizationId=${filterParams.organizationId}` : ""}`}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-xl transition-colors"
            >
              Show Entire Team
            </Link>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400">
                <th className="pb-3 pr-4 font-bold uppercase text-[11px]">Salesperson Name</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px] text-right">Total Visits</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px] text-right">Completed</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px] text-right">No. of Quotes</th>
                <th className="pb-3 pr-8 pl-4 font-bold uppercase text-[11px] text-right">Quoted Value (₹)</th>
                <th className="pb-3 pl-8 pr-4 font-bold uppercase text-[11px] text-right">Orders Won</th>
                <th className="pb-3 pl-4 font-bold uppercase text-[11px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {repPerformance.map((rep) => {
                const isSelected = filterParams.employeeId === rep.employeeId;

                return (
                  <tr
                    key={rep.employeeId}
                    className={`transition-colors ${
                      isSelected
                        ? "bg-orange-50/70 border-l-4 border-orange-500"
                        : "hover:bg-orange-50/30"
                    }`}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-600 flex-shrink-0" />
                        )}
                        <div>
                          <span className="font-bold text-slate-900 block">{rep.name}</span>
                          <span className="text-[11px] text-slate-400">{rep.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">{rep.totalVisits}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">{rep.completedVisits}</td>
                    <td className="py-3 px-4 text-right font-bold text-orange-600">{rep.quotationsGenerated}</td>
                    <td className="py-3 pr-8 pl-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatIndianCurrency(rep.quotationValue)}
                    </td>
                    <td className="py-3 pl-8 pr-4 text-right font-bold text-emerald-600">{rep.ordersConverted}</td>
                    <td className="py-3 pl-4 text-right">
                      {isSelected ? (
                        <Link
                          href={`/visits?period=${filterParams.period}${filterParams.organizationId ? `&organizationId=${filterParams.organizationId}` : ""}`}
                          className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs transition-colors"
                        >
                          Clear
                        </Link>
                      ) : (
                        <Link
                          href={`/visits?period=${filterParams.period}${filterParams.organizationId ? `&organizationId=${filterParams.organizationId}` : ""}&employeeId=${rep.employeeId}`}
                          className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-colors"
                        >
                          View Charts →
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Common Salesperson Activity Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              {isFilteredByRep && selectedEmployee
                ? `Showing Activities for ${selectedEmployee.name}`
                : "Individual Salesperson Activity Filter"}
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Filter Weekly Cadence, Visit Outcomes, and the Visit Register below by sales representative
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isFilteredByRep && (
            <Link
              href={`/visits?period=${filterParams.period}${filterParams.organizationId ? `&organizationId=${filterParams.organizationId}` : ""}`}
              className="text-xs text-orange-600 hover:text-orange-700 font-semibold px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 transition-colors"
            >
              Clear Filter ✕
            </Link>
          )}

          <SelectFilter
            name="employeeId"
            defaultValue={filterParams.employeeId || "ALL"}
            options={[
              { value: "ALL", label: "All Sales Representatives (Entire Team)" },
              ...employees.map((emp) => ({
                value: emp.id,
                label: emp.name,
              })),
            ]}
            className="bg-white border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-xs cursor-pointer"
          />
        </div>
      </div>

      {/* Charts: Weekly Activity & Visit Outcomes (Filtered by Selected Salesperson) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Weekly Field Visit Cadence</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {isFilteredByRep && selectedEmployee
                  ? `${selectedEmployee.name} • Weekly completed client visits vs pending meetings`
                  : "Weekly completed client visits vs pending meetings"}
              </p>
            </div>
            {isFilteredByRep && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                Filtered
              </span>
            )}
          </div>
          <VisitActivityChart data={weeklyActivityTrend} />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Visit Classification & Outcomes</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {isFilteredByRep && selectedEmployee
                  ? `${selectedEmployee.name} • Distribution by visit classification type`
                  : "Distribution by visit classification type"}
              </p>
            </div>
            {isFilteredByRep && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                Filtered
              </span>
            )}
          </div>
          <div className="space-y-3 pt-2">
            {visitOutcomes.length > 0 ? (
              visitOutcomes.map((o) => (
                <div
                  key={o.outcome}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-orange-50/20 transition-colors"
                >
                  <span className="text-xs font-bold text-slate-800">{o.outcome}</span>
                  <span className="text-sm font-black text-orange-600">{o.count} visits</span>
                </div>
              ))
            ) : (
              <div className="h-40 flex items-center justify-center text-xs text-slate-400">
                No visit records for the selected filters
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Visit Register Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Customer Visits Register</h3>
            <p className="text-xs text-slate-500">
              {isFilteredByRep && selectedEmployee
                ? `Audit log of visits conducted by ${selectedEmployee.name}`
                : "Complete audit log of completed and scheduled client visits"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <form method="GET" className="relative">
              <input type="hidden" name="period" value={filterParams.period} />
              {filterParams.organizationId && (
                <input type="hidden" name="organizationId" value={filterParams.organizationId} />
              )}
              {filterParams.employeeId && (
                <input type="hidden" name="employeeId" value={filterParams.employeeId} />
              )}
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                name="search"
                defaultValue={filterParams.search || ""}
                placeholder="Search customer, rep, notes..."
                className="bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 pl-9 pr-3 py-1.5 rounded-xl text-xs w-52 focus:w-64 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-xs transition-all"
              />
            </form>

            <SelectFilter
              name="status"
              defaultValue={filterParams.status || "ALL"}
              options={[
                { value: "ALL", label: "All Statuses" },
                { value: "COMPLETED", label: "Completed" },
                { value: "SCHEDULED", label: "Scheduled" },
                { value: "PENDING", label: "Pending" },
              ]}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400">
                <th className="pb-3 pr-4 font-bold uppercase text-[11px]">Sales Rep</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px]">Customer</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px]">Visit Date</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px]">Type</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px]">Status</th>
                <th className="pb-3 px-4 font-bold uppercase text-[11px]">Visit Summary Notes</th>
                <th className="pb-3 pl-4 font-bold uppercase text-[11px]">Next Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visits.length > 0 ? (
                visits.map((v) => (
                  <tr key={v.id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="py-3 pr-4 font-bold text-slate-900">{v.salespersonName}</td>
                    <td className="py-3 px-4 text-slate-800 font-medium truncate max-w-[170px]">{v.customerName}</td>
                    <td className="py-3 px-4 text-slate-500">{v.visitDate}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{v.visitType}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${
                          v.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 truncate max-w-[250px]">{v.visitReport}</td>
                    <td className="py-3 pl-4 text-orange-600 font-semibold">{v.nextFollowupDate}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No visit records found for the selected salesperson and criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500">
          <div>
            Showing <span className="text-slate-900 font-bold">{visits.length}</span> of{" "}
            <span className="text-slate-900 font-bold">{pagination.totalCount}</span> visits
          </div>

          <div className="flex items-center gap-2">
            {pagination.page > 1 && (
              <Link
                href={`/visits?period=${filterParams.period}&page=${pagination.page - 1}${filterParams.organizationId ? `&organizationId=${filterParams.organizationId}` : ""}${filterParams.employeeId ? `&employeeId=${filterParams.employeeId}` : ""}${filterParams.status ? `&status=${filterParams.status}` : ""}${filterParams.startDate ? `&startDate=${filterParams.startDate}` : ""}${filterParams.endDate ? `&endDate=${filterParams.endDate}` : ""}${filterParams.search ? `&search=${encodeURIComponent(filterParams.search)}` : ""}`}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Previous
              </Link>
            )}
            <span className="px-2 font-medium">
              Page {pagination.page} of {Math.max(1, pagination.totalPages)}
            </span>
            {pagination.page < pagination.totalPages && (
              <Link
                href={`/visits?period=${filterParams.period}&page=${pagination.page + 1}${filterParams.organizationId ? `&organizationId=${filterParams.organizationId}` : ""}${filterParams.employeeId ? `&employeeId=${filterParams.employeeId}` : ""}${filterParams.status ? `&status=${filterParams.status}` : ""}${filterParams.startDate ? `&startDate=${filterParams.startDate}` : ""}${filterParams.endDate ? `&endDate=${filterParams.endDate}` : ""}${filterParams.search ? `&search=${encodeURIComponent(filterParams.search)}` : ""}`}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
