import { NextRequest, NextResponse } from "next/server";
import { getTargetReport } from "@/lib/services/target-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const yearStr = searchParams.get("year");
    const organizationId = searchParams.get("organizationId") || undefined;
    const employeeId = searchParams.get("employeeId") || undefined;
    const includeAll = searchParams.get("includeAll") === "true";

    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();

    const data = await getTargetReport({
      year,
      organizationId,
      employeeId,
      includeAllSalespersons: includeAll,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Failed to fetch target report:", error);
    return NextResponse.json(
      { error: "Failed to generate sales target report", details: error.message },
      { status: 500 }
    );
  }
}

