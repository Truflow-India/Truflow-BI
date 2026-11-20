import { NextRequest, NextResponse } from "next/server";
import { getVisitAnalytics, VisitFilterParams } from "@/lib/services/visit-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const params: VisitFilterParams = {
      period: (searchParams.get("period") as any) || "this_month",
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      employeeId: searchParams.get("employeeId") || undefined,
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1,
      pageSize: searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 20,
    };

    const data = await getVisitAnalytics(params);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Visit API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
