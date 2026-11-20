import { NextRequest, NextResponse } from "next/server";
import { getCustomerAnalytics, CustomerFilterParams } from "@/lib/services/customer-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const params: CustomerFilterParams = {
      period: (searchParams.get("period") as any) || "this_month",
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      organizationId: searchParams.get("organizationId") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1,
      pageSize: searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 20,
    };

    const data = await getCustomerAnalytics(params);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Customer API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
