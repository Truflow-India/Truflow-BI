import React from "react";
import { getTargetReport } from "@/lib/services/target-service";
import { TargetDashboard } from "@/components/target/TargetDashboard";
import { getEffectiveFilters } from "@/lib/filter-utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function TargetPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const effective = await getEffectiveFilters(resolved);

  const year = resolved.year ? parseInt(resolved.year, 10) : new Date().getFullYear();
  const organizationId = effective.organizationId;
  const employeeId = resolved.employeeId;
  const includeAll = resolved.includeAll === "true";

  const initialData = await getTargetReport({
    year,
    organizationId,
    employeeId,
    includeAllSalespersons: includeAll,
  });

  return <TargetDashboard initialData={initialData} />;
}

