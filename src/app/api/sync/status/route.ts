import { NextResponse } from "next/server";
import { zohoDb } from "@/lib/database/zoho-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Get recent sync logs
    const recentLogs = await zohoDb.syncLog.findMany({
      take: 25,
      orderBy: { startedAt: "desc" },
    });

    // 2. Get last successful sync per module
    const modules = ["quotations", "salesorders", "invoices", "payments", "customers"];
    const moduleStatus: Record<string, any> = {};

    for (const mod of modules) {
      const lastSuccess = await zohoDb.syncLog.findFirst({
        where: { module: mod, status: "SUCCESS" },
        orderBy: { completedAt: "desc" },
      });

      const lastAttempt = await zohoDb.syncLog.findFirst({
        where: { module: mod },
        orderBy: { startedAt: "desc" },
      });

      moduleStatus[mod] = {
        lastSuccessfulSync: lastSuccess?.completedAt || null,
        lastAttemptedSync: lastAttempt?.startedAt || null,
        status: lastAttempt?.status || "NEVER_RUN",
        recordsProcessed: lastAttempt?.recordsProcessed || 0,
        recordsCreated: lastAttempt?.recordsCreated || 0,
        recordsUpdated: lastAttempt?.recordsUpdated || 0,
        recordsFailed: lastAttempt?.recordsFailed || 0,
        errorMessage: lastAttempt?.errorMessage || null,
      };
    }

    // 3. Overall last successful sync time
    const lastGlobalSuccess = await zohoDb.syncLog.findFirst({
      where: { status: "SUCCESS" },
      orderBy: { completedAt: "desc" },
    });

    // 4. Record counts in Zoho reporting database
    const [quotationsCount, salesOrdersCount, invoicesCount, paymentsCount, customersCount, mappingsCount] =
      await Promise.all([
        zohoDb.quotation.count(),
        zohoDb.salesOrder.count(),
        zohoDb.invoice.count(),
        zohoDb.payment.count(),
        zohoDb.zohoCustomer.count(),
        zohoDb.customerMapping.count(),
      ]);

    return NextResponse.json({
      success: true,
      lastSuccessfulSync: lastGlobalSuccess?.completedAt || null,
      modules: moduleStatus,
      counts: {
        quotations: quotationsCount,
        salesOrders: salesOrdersCount,
        invoices: invoicesCount,
        payments: paymentsCount,
        customers: customersCount,
        customerMappings: mappingsCount,
      },
      recentLogs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
