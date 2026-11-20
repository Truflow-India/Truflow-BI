import { cookies } from "next/headers";

export interface EffectiveFilterParams {
  period: string;
  organizationId?: string;
  startDate?: string;
  endDate?: string;
}

export async function getEffectiveFilters(searchParams: {
  [key: string]: string | undefined;
}): Promise<EffectiveFilterParams> {
  let savedOrg: string | undefined = undefined;
  let savedPeriod: string | undefined = undefined;
  let savedStartDate: string | undefined = undefined;
  let savedEndDate: string | undefined = undefined;

  try {
    const cookieStore = await cookies();
    const orgCookie = cookieStore.get("dashboard_org")?.value;
    const periodCookie = cookieStore.get("dashboard_period")?.value;
    const startCookie = cookieStore.get("dashboard_start_date")?.value;
    const endCookie = cookieStore.get("dashboard_end_date")?.value;

    if (orgCookie && orgCookie !== "all" && orgCookie !== "") {
      savedOrg = orgCookie;
    }
    if (periodCookie && periodCookie !== "") {
      savedPeriod = periodCookie;
    }
    if (startCookie) {
      savedStartDate = startCookie;
    }
    if (endCookie) {
      savedEndDate = endCookie;
    }
  } catch {
    // In environments where cookies() isn't accessible, fallback gracefully
  }

  // Determine effective organizationId:
  // If explicitly in searchParams:
  // - "all" or "" means all organizations
  // - non-empty ID means specific organization
  // If undefined in searchParams: fall back to cookie preference
  let organizationId: string | undefined = undefined;
  if (searchParams.organizationId !== undefined) {
    if (searchParams.organizationId !== "all" && searchParams.organizationId !== "") {
      organizationId = searchParams.organizationId;
    } else {
      organizationId = undefined;
    }
  } else {
    organizationId = savedOrg;
  }

  // Determine effective period:
  const period = searchParams.period || savedPeriod || "this_month";

  return {
    period,
    organizationId,
    startDate: searchParams.startDate || (period === "custom" ? savedStartDate : undefined),
    endDate: searchParams.endDate || (period === "custom" ? savedEndDate : undefined),
  };
}

