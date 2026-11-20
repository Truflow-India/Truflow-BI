import { NextRequest, NextResponse } from "next/server";
import { ZohoSyncService } from "@/lib/sync/zoho-sync-service";
import { runCustomerCorrelation } from "@/lib/sync/customer-matcher";

export const maxDuration = 300; // Allow 5 minutes on serverless if needed
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Optional secret check if invoked from external cron
    if (cronSecret && authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      if (token !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const isFullSync = Boolean(body.isFullSync);
    const organizationId = body.organizationId || undefined;
    const modules = body.modules || undefined;
    const triggerType = body.triggerType || "MANUAL";

    const syncService = new ZohoSyncService();
    const results = await syncService.syncAll({
      isFullSync,
      organizationId,
      modules,
      triggerType,
    });

    // Run customer correlation after sync
    let correlationResult = null;
    try {
      correlationResult = await runCustomerCorrelation();
    } catch (e: any) {
      console.warn("Correlation warning:", e.message);
    }

    return NextResponse.json({
      success: true,
      message: "Zoho synchronization completed",
      results,
      correlation: correlationResult,
    });
  } catch (error: any) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
