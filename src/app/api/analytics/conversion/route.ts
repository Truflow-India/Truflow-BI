import { NextRequest, NextResponse } from "next/server";
import { getConversionAnalytics, ConversionFilterParams } from "@/lib/services/conversion-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const params: ConversionFilterParams = {
      period: (searchParams.get("period") as any) || "this_month",
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      organizationId: searchParams.get("organizationId") || undefined,
      salespersonName: searchParams.get("salespersonName") || undefined,
    };

    const data = await getConversionAnalytics(params);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Conversion API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
