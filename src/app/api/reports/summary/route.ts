import { NextRequest, NextResponse } from "next/server";
import { generateReportData } from "@/lib/services/report-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const periodType = (searchParams.get("type") as any) || "this_month";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const data = await generateReportData(periodType, startDate, endDate);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Report summary API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
