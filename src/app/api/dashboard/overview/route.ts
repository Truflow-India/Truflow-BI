import { NextRequest, NextResponse } from "next/server";
import { getOverviewData, OverviewFilterParams } from "@/lib/services/overview-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const params: OverviewFilterParams = {
      period: (searchParams.get("period") as any) || "this_month",
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      salespersonName: searchParams.get("salespersonName") || undefined,
      customerId: searchParams.get("customerId") || undefined,
      status: searchParams.get("status") || undefined,
      organizationId: searchParams.get("organizationId") || undefined,
    };

    const data = await getOverviewData(params);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Overview API error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
