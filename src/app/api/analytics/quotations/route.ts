import { NextRequest, NextResponse } from "next/server";
import { getQuotationAnalytics, QuotationFilterParams } from "@/lib/services/quotation-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const params: QuotationFilterParams = {
      period: (searchParams.get("period") as any) || "this_month",
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      search: searchParams.get("search") || undefined,
      status: searchParams.get("status") || undefined,
      salespersonName: searchParams.get("salespersonName") || undefined,
      customerId: searchParams.get("customerId") || undefined,
      organizationId: searchParams.get("organizationId") || undefined,
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1,
      pageSize: searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 20,
      sortBy: searchParams.get("sortBy") || "quotationDate",
      sortOrder: (searchParams.get("sortOrder") as any) || "desc",
    };

    const data = await getQuotationAnalytics(params);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Quotation API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
