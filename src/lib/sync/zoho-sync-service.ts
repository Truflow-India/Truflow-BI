/**
 * Zoho Books Synchronization Service
 * Handles paginated fetching, concurrent batch upserting, incremental synchronization with safety overlap,
 * duplicate prevention, and sync audit logging.
 */

import { ZohoBooksClient } from "../zoho/api-client";
import { zohoDb } from "../database/zoho-db";
import { subMinutes, format } from "date-fns";

export interface SyncOptions {
  isFullSync?: boolean;
  triggerType?: "MANUAL" | "SCHEDULED" | "INITIAL";
  organizationId?: string;
  modules?: Array<"quotations" | "salesorders" | "invoices" | "payments" | "customers">;
}

export interface SyncResult {
  module: string;
  organizationId: string;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  status: "SUCCESS" | "FAILED";
  errorMessage?: string;
}

function parseZohoDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function isIntercompany(orgId: string, customerName: string): boolean {
  const norm = (customerName || "").toLowerCase().trim();
  if (orgId === "771755208") {
    // TruFlow books: Sibling is Zeetork Private Limited, NOT Pte Ltd
    if (norm.includes("pte ltd") || norm.includes("pte. ltd")) return false;
    return (
      norm.includes("zeetork automation and control pvt") ||
      norm.includes("zeetork automation & control private limited") ||
      norm.includes("zeetork automation & control pvt")
    );
  } else if (orgId === "876204905") {
    // Zeetork books: Sibling is TruFlow Solutions Private Limited
    return norm.includes("truflow");
  }
  return false;
}

export function detectBusinessType(currencyCode: string, customerName: string): "Domestic" | "Export" {
  if (currencyCode && currencyCode !== "INR") return "Export";
  const norm = (customerName || "").toLowerCase();
  if (norm.includes("pte ltd") || norm.includes("pte. ltd") || norm.includes("(usd)")) return "Export";
  return "Domestic";
}

async function processInChunks<T>(items: T[], chunkSize: number, fn: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await Promise.all(chunk.map((item) => fn(item)));
  }
}

export class ZohoSyncService {
  private activeOrganizations: string[];

  constructor() {
    const orgs = [
      process.env.ZOHO_ORG_TRUFLOW || "771755208",
      process.env.ZOHO_ORG_ZEETORK || "876204905",
    ];
    this.activeOrganizations = Array.from(new Set(orgs.filter(Boolean)));
  }

  private async getLastSyncFilter(orgId: string, moduleName: string): Promise<string | undefined> {
    const lastSuccessLog = await zohoDb.syncLog.findFirst({
      where: {
        organizationId: orgId,
        module: moduleName,
        status: "SUCCESS",
        completedAt: { not: null },
      },
      orderBy: { completedAt: "desc" },
    });

    if (!lastSuccessLog || !lastSuccessLog.completedAt) {
      return undefined;
    }

    const safeWindowDate = subMinutes(lastSuccessLog.completedAt, 30);
    return format(safeWindowDate, "yyyy-MM-dd'T'HH:mm:ss+0530");
  }

  /**
   * Sync Quotations (Estimates)
   */
  async syncQuotations(orgId: string, isFullSync = false, triggerType = "MANUAL"): Promise<SyncResult> {
    const client = new ZohoBooksClient(orgId);
    const syncLog = await zohoDb.syncLog.create({
      data: {
        module: "quotations",
        organizationId: orgId,
        status: "IN_PROGRESS",
        triggerType,
      },
    });

    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;

    try {
      const timeFilter = isFullSync ? undefined : await this.getLastSyncFilter(orgId, "quotations");
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const res = await client.getEstimates({
          page,
          per_page: 200,
          last_modified_time: timeFilter,
        });

        const estimates = res.estimates || [];
        await processInChunks(estimates, 20, async (est) => {
          recordsProcessed++;
          try {
            const zohoQuotationId = String(est.estimate_id);
            const quotationNumber = est.estimate_number || "Draft";
            const referenceNumber = est.reference_number || null;
            const customerId = String(est.customer_id || "");
            const customerName = est.customer_name || est.company_name || "Unknown Customer";
            const companyName = est.company_name || null;
            const salespersonId = est.salesperson_id ? String(est.salesperson_id) : null;
            const salespersonName = est.salesperson_name || null;
            const quotationDate = parseZohoDate(est.date) || new Date();
            const expiryDate = parseZohoDate(est.expiry_date);
            const origAmt = Number(est.total) || 0;
            const currencyCode = est.currency_code || "INR";
            const exRate = Number(est.exchange_rate) || (currencyCode === "INR" ? 1.0 : 83.5);
            const totalAmount = currencyCode === "INR" ? origAmt : (Number(est.bcy_total) || (origAmt * exRate));
            const status = (est.status || "draft").toLowerCase();
            const offerStatus = est.cf_offer_status || est.current_sub_status || null;
            const isIC = isIntercompany(orgId, customerName);
            const bType = detectBusinessType(currencyCode, customerName);

            const isConverted =
              status === "invoiced" ||
              Boolean(est.salesorder_id) ||
              Boolean(est.salesorder_number);

            const convertedSalesOrderId = est.salesorder_id ? String(est.salesorder_id) : null;
            const convertedSalesOrderNumber = est.salesorder_number || null;

            const isLost =
              status === "declined" ||
              status === "rejected" ||
              offerStatus === "Lost";

            const lostReason = isLost ? est.decline_reason || offerStatus || "Quotation Declined" : null;
            const lostDate = isLost ? parseZohoDate(est.declined_date) || new Date() : null;
            const lastModifiedTime = parseZohoDate(est.last_modified_time) || new Date();

            const existing = await zohoDb.quotation.findUnique({
              where: { zohoQuotationId },
              select: { id: true },
            });

            await zohoDb.quotation.upsert({
              where: { zohoQuotationId },
              create: {
                zohoQuotationId,
                organizationId: orgId,
                quotationNumber,
                referenceNumber,
                customerId,
                customerName,
                companyName,
                salespersonId,
                salespersonName,
                quotationDate,
                expiryDate,
                totalAmount,
                originalAmount: origAmt,
                currencyCode,
                exchangeRate: exRate,
                businessType: bType,
                isIntercompany: isIC,
                status,
                offerStatus,
                convertedSalesOrderId,
                convertedSalesOrderNumber,
                isConverted,
                isLost,
                lostReason,
                lostDate,
                lastModifiedTime,
              },
              update: {
                organizationId: orgId,
                quotationNumber,
                referenceNumber,
                customerId,
                customerName,
                companyName,
                salespersonId,
                salespersonName,
                quotationDate,
                expiryDate,
                totalAmount,
                originalAmount: origAmt,
                currencyCode,
                exchangeRate: exRate,
                businessType: bType,
                isIntercompany: isIC,
                status,
                offerStatus,
                convertedSalesOrderId,
                convertedSalesOrderNumber,
                isConverted,
                isLost,
                lostReason,
                lostDate,
                lastModifiedTime,
              },
            });

            if (existing) {
              recordsUpdated++;
            } else {
              recordsCreated++;
            }
          } catch (itemErr) {
            recordsFailed++;
            console.error(`Error processing estimate ${est.estimate_id}:`, itemErr);
          }
        });

        console.log(`[Sync] Org ${orgId} quotations page ${page} done. Total processed: ${recordsProcessed}`);
        hasMore = res.page_context?.has_more_page ?? false;
        page++;
        if (hasMore) await new Promise((r) => setTimeout(r, 150));
      }

      await zohoDb.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "SUCCESS",
          completedAt: new Date(),
          recordsProcessed,
          recordsCreated,
          recordsUpdated,
          recordsFailed,
        },
      });

      return {
        module: "quotations",
        organizationId: orgId,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        status: "SUCCESS",
      };
    } catch (err: any) {
      await zohoDb.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          recordsProcessed,
          recordsCreated,
          recordsUpdated,
          recordsFailed,
          errorMessage: err.message,
        },
      });
      return {
        module: "quotations",
        organizationId: orgId,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        status: "FAILED",
        errorMessage: err.message,
      };
    }
  }

  /**
   * Sync Sales Orders
   */
  async syncSalesOrders(orgId: string, isFullSync = false, triggerType = "MANUAL"): Promise<SyncResult> {
    const client = new ZohoBooksClient(orgId);
    const syncLog = await zohoDb.syncLog.create({
      data: {
        module: "salesorders",
        organizationId: orgId,
        status: "IN_PROGRESS",
        triggerType,
      },
    });

    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;

    try {
      const timeFilter = isFullSync ? undefined : await this.getLastSyncFilter(orgId, "salesorders");
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const res = await client.getSalesOrders({
          page,
          per_page: 200,
          last_modified_time: timeFilter,
        });

        const orders = res.salesorders || [];
        await processInChunks(orders, 20, async (so) => {
          recordsProcessed++;
          try {
            const zohoSalesOrderId = String(so.salesorder_id);
            const salesOrderNumber = so.salesorder_number || "Draft Order";
            const referenceNumber = so.reference_number || null;
            const customerId = String(so.customer_id || "");
            const customerName = so.customer_name || so.company_name || "Unknown Customer";
            const companyName = so.company_name || null;
            const salespersonId = so.salesperson_id ? String(so.salesperson_id) : null;
            const salespersonName = so.salesperson_name || null;
            const orderDate = parseZohoDate(so.date) || new Date();
            const deliveryDate = parseZohoDate(so.shipment_date || so.delivery_date);
            const origAmt = Number(so.total) || 0;
            const currencyCode = so.currency_code || "INR";
            const bcyTotal = Number(so.bcy_total) || 0;
            const exRate = Number(so.exchange_rate) || (currencyCode === "INR" ? 1.0 : (bcyTotal && origAmt ? bcyTotal / origAmt : 83.5));
            const totalAmount = currencyCode === "INR" ? origAmt : (bcyTotal || (origAmt * exRate));
            const status = (so.status || "draft").toLowerCase();
            const orderStatus = so.order_status || null;
            const invoicedStatus = so.invoiced_status || null;
            const associatedQuotationId = so.estimate_id ? String(so.estimate_id) : null;
            const lastModifiedTime = parseZohoDate(so.last_modified_time) || new Date();
            const isIC = isIntercompany(orgId, customerName);
            const bType = detectBusinessType(currencyCode, customerName);

            const existing = await zohoDb.salesOrder.findUnique({
              where: { zohoSalesOrderId },
              select: { id: true },
            });

            await zohoDb.salesOrder.upsert({
              where: { zohoSalesOrderId },
              create: {
                zohoSalesOrderId,
                organizationId: orgId,
                salesOrderNumber,
                referenceNumber,
                customerId,
                customerName,
                companyName,
                salespersonId,
                salespersonName,
                orderDate,
                deliveryDate,
                totalAmount,
                originalAmount: origAmt,
                currencyCode,
                exchangeRate: exRate,
                businessType: bType,
                isIntercompany: isIC,
                status,
                orderStatus,
                invoicedStatus,
                associatedQuotationId,
                lastModifiedTime,
              },
              update: {
                organizationId: orgId,
                salesOrderNumber,
                referenceNumber,
                customerId,
                customerName,
                companyName,
                salespersonId,
                salespersonName,
                orderDate,
                deliveryDate,
                totalAmount,
                originalAmount: origAmt,
                currencyCode,
                exchangeRate: exRate,
                businessType: bType,
                isIntercompany: isIC,
                status,
                orderStatus,
                invoicedStatus,
                associatedQuotationId,
                lastModifiedTime,
              },
            });

            if (associatedQuotationId) {
              await zohoDb.quotation.updateMany({
                where: { zohoQuotationId: associatedQuotationId },
                data: {
                  isConverted: true,
                  convertedSalesOrderId: zohoSalesOrderId,
                  convertedSalesOrderNumber: salesOrderNumber,
                },
              });
            }

            if (existing) {
              recordsUpdated++;
            } else {
              recordsCreated++;
            }
          } catch (itemErr) {
            recordsFailed++;
            console.error(`Error processing sales order ${so.salesorder_id}:`, itemErr);
          }
        });

        console.log(`[Sync] Org ${orgId} salesorders page ${page} done. Total processed: ${recordsProcessed}`);
        hasMore = res.page_context?.has_more_page ?? false;
        page++;
        if (hasMore) await new Promise((r) => setTimeout(r, 150));
      }

      await zohoDb.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "SUCCESS",
          completedAt: new Date(),
          recordsProcessed,
          recordsCreated,
          recordsUpdated,
          recordsFailed,
        },
      });

      return {
        module: "salesorders",
        organizationId: orgId,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        status: "SUCCESS",
      };
    } catch (err: any) {
      await zohoDb.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          recordsProcessed,
          recordsCreated,
          recordsUpdated,
          recordsFailed,
          errorMessage: err.message,
        },
      });
      return {
        module: "salesorders",
        organizationId: orgId,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        status: "FAILED",
        errorMessage: err.message,
      };
    }
  }

  /**
   * Sync Invoices
   */
  async syncInvoices(orgId: string, isFullSync = false, triggerType = "MANUAL"): Promise<SyncResult> {
    const client = new ZohoBooksClient(orgId);
    const syncLog = await zohoDb.syncLog.create({
      data: {
        module: "invoices",
        organizationId: orgId,
        status: "IN_PROGRESS",
        triggerType,
      },
    });

    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;

    try {
      const timeFilter = isFullSync ? undefined : await this.getLastSyncFilter(orgId, "invoices");
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const res = await client.getInvoices({
          page,
          per_page: 200,
          last_modified_time: timeFilter,
        });

        const invoices = res.invoices || [];
        await processInChunks(invoices, 20, async (inv) => {
          recordsProcessed++;
          try {
            const zohoInvoiceId = String(inv.invoice_id);
            const invoiceNumber = inv.invoice_number || "Draft Invoice";
            const referenceNumber = inv.reference_number || null;
            const customerId = String(inv.customer_id || "");
            const customerName = inv.customer_name || inv.company_name || "Unknown Customer";
            const companyName = inv.company_name || null;
            const salespersonId = inv.salesperson_id ? String(inv.salesperson_id) : null;
            const salespersonName = inv.salesperson_name || null;
            const invoiceDate = parseZohoDate(inv.date) || new Date();
            const dueDate = parseZohoDate(inv.due_date);
            const origAmt = Number(inv.total) || 0;
            const currencyCode = inv.currency_code || "INR";
            const exRate = Number(inv.exchange_rate) || 1.0;
            const totalAmount = currencyCode === "INR" ? origAmt : (origAmt * exRate);
            const balance = Number(inv.balance) * (currencyCode === "INR" ? 1.0 : exRate);
            const status = (inv.status || "draft").toLowerCase();
            const lastModifiedTime = parseZohoDate(inv.last_modified_time) || new Date();
            const isIC = isIntercompany(orgId, customerName);
            const bType = detectBusinessType(currencyCode, customerName);

            const existing = await zohoDb.invoice.findUnique({
              where: { zohoInvoiceId },
              select: { id: true },
            });

            await zohoDb.invoice.upsert({
              where: { zohoInvoiceId },
              create: {
                zohoInvoiceId,
                organizationId: orgId,
                invoiceNumber,
                referenceNumber,
                customerId,
                customerName,
                companyName,
                salespersonId,
                salespersonName,
                invoiceDate,
                dueDate,
                totalAmount,
                originalAmount: origAmt,
                balance,
                currencyCode,
                exchangeRate: exRate,
                businessType: bType,
                isIntercompany: isIC,
                status,
                lastModifiedTime,
              },
              update: {
                organizationId: orgId,
                invoiceNumber,
                referenceNumber,
                customerId,
                customerName,
                companyName,
                salespersonId,
                salespersonName,
                invoiceDate,
                dueDate,
                totalAmount,
                originalAmount: origAmt,
                balance,
                currencyCode,
                exchangeRate: exRate,
                businessType: bType,
                isIntercompany: isIC,
                status,
                lastModifiedTime,
              },
            });

            if (existing) {
              recordsUpdated++;
            } else {
              recordsCreated++;
            }
          } catch (itemErr) {
            recordsFailed++;
            console.error(`Error processing invoice ${inv.invoice_id}:`, itemErr);
          }
        });

        console.log(`[Sync] Org ${orgId} invoices page ${page} done. Total processed: ${recordsProcessed}`);
        hasMore = res.page_context?.has_more_page ?? false;
        page++;
        if (hasMore) await new Promise((r) => setTimeout(r, 150));
      }

      await zohoDb.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "SUCCESS",
          completedAt: new Date(),
          recordsProcessed,
          recordsCreated,
          recordsUpdated,
          recordsFailed,
        },
      });

      return {
        module: "invoices",
        organizationId: orgId,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        status: "SUCCESS",
      };
    } catch (err: any) {
      await zohoDb.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          recordsProcessed,
          recordsCreated,
          recordsUpdated,
          recordsFailed,
          errorMessage: err.message,
        },
      });
      return {
        module: "invoices",
        organizationId: orgId,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        status: "FAILED",
        errorMessage: err.message,
      };
    }
  }

  /**
   * Sync Payments
   */
  async syncPayments(orgId: string, isFullSync = false, triggerType = "MANUAL"): Promise<SyncResult> {
    const client = new ZohoBooksClient(orgId);
    const syncLog = await zohoDb.syncLog.create({
      data: {
        module: "payments",
        organizationId: orgId,
        status: "IN_PROGRESS",
        triggerType,
      },
    });

    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;

    try {
      const timeFilter = isFullSync ? undefined : await this.getLastSyncFilter(orgId, "payments");
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const res = await client.getCustomerPayments({
          page,
          per_page: 200,
          last_modified_time: timeFilter,
        });

        const payments = res.customerpayments || [];
        await processInChunks(payments, 20, async (p) => {
          recordsProcessed++;
          try {
            const zohoPaymentId = String(p.payment_id);
            const paymentNumber = p.payment_number ? String(p.payment_number) : null;
            const customerId = String(p.customer_id || "");
            const customerName = p.customer_name || null;
            const invoiceNumbers = p.invoice_numbers || null;
            const paymentDate = parseZohoDate(p.date) || new Date();
            const amount = Number(p.amount) || 0;
            const paymentMode = p.payment_mode || p.payment_type || null;
            const status = (p.payment_status || "paid").toLowerCase();
            const lastModifiedTime = parseZohoDate(p.last_modified_time) || new Date();

            const existing = await zohoDb.payment.findUnique({
              where: { zohoPaymentId },
              select: { id: true },
            });

            await zohoDb.payment.upsert({
              where: { zohoPaymentId },
              create: {
                zohoPaymentId,
                organizationId: orgId,
                paymentNumber,
                customerId,
                customerName,
                invoiceNumbers,
                paymentDate,
                amount,
                paymentMode,
                status,
                lastModifiedTime,
              },
              update: {
                organizationId: orgId,
                paymentNumber,
                customerId,
                customerName,
                invoiceNumbers,
                paymentDate,
                amount,
                paymentMode,
                status,
                lastModifiedTime,
              },
            });

            if (existing) {
              recordsUpdated++;
            } else {
              recordsCreated++;
            }
          } catch (itemErr) {
            recordsFailed++;
            console.error(`Error processing payment ${p.payment_id}:`, itemErr);
          }
        });

        console.log(`[Sync] Org ${orgId} payments page ${page} done. Total processed: ${recordsProcessed}`);
        hasMore = res.page_context?.has_more_page ?? false;
        page++;
        if (hasMore) await new Promise((r) => setTimeout(r, 150));
      }

      await zohoDb.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "SUCCESS",
          completedAt: new Date(),
          recordsProcessed,
          recordsCreated,
          recordsUpdated,
          recordsFailed,
        },
      });

      return {
        module: "payments",
        organizationId: orgId,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        status: "SUCCESS",
      };
    } catch (err: any) {
      await zohoDb.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          recordsProcessed,
          recordsCreated,
          recordsUpdated,
          recordsFailed,
          errorMessage: err.message,
        },
      });
      return {
        module: "payments",
        organizationId: orgId,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        status: "FAILED",
        errorMessage: err.message,
      };
    }
  }

  /**
   * Sync Contacts (Zoho Customers)
   */
  async syncCustomers(orgId: string, isFullSync = false, triggerType = "MANUAL"): Promise<SyncResult> {
    const client = new ZohoBooksClient(orgId);
    const syncLog = await zohoDb.syncLog.create({
      data: {
        module: "customers",
        organizationId: orgId,
        status: "IN_PROGRESS",
        triggerType,
      },
    });

    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;

    try {
      const timeFilter = isFullSync ? undefined : await this.getLastSyncFilter(orgId, "customers");
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const res = await client.getContacts({
          page,
          per_page: 200,
          last_modified_time: timeFilter,
        });

        const contacts = res.contacts || [];
        await processInChunks(contacts, 20, async (c) => {
          recordsProcessed++;
          try {
            const zohoCustomerId = String(c.contact_id);
            const customerName = c.contact_name || c.company_name || "Unknown Customer";
            const companyName = c.company_name || null;
            const email = c.email || null;
            const phone = c.phone || null;
            const mobile = c.mobile || null;
            const createdDate = parseZohoDate(c.created_time);
            const lastModifiedTime = parseZohoDate(c.last_modified_time) || new Date();

            const existing = await zohoDb.zohoCustomer.findUnique({
              where: { zohoCustomerId },
              select: { id: true },
            });

            await zohoDb.zohoCustomer.upsert({
              where: { zohoCustomerId },
              create: {
                zohoCustomerId,
                organizationId: orgId,
                customerName,
                companyName,
                email,
                phone,
                mobile,
                createdDate,
                lastModifiedTime,
              },
              update: {
                organizationId: orgId,
                customerName,
                companyName,
                email,
                phone,
                mobile,
                lastModifiedTime,
              },
            });

            if (existing) {
              recordsUpdated++;
            } else {
              recordsCreated++;
            }
          } catch (itemErr) {
            recordsFailed++;
            console.error(`Error processing contact ${c.contact_id}:`, itemErr);
          }
        });

        console.log(`[Sync] Org ${orgId} customers page ${page} done. Total processed: ${recordsProcessed}`);
        hasMore = res.page_context?.has_more_page ?? false;
        page++;
        if (hasMore) await new Promise((r) => setTimeout(r, 150));
      }

      await zohoDb.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "SUCCESS",
          completedAt: new Date(),
          recordsProcessed,
          recordsCreated,
          recordsUpdated,
          recordsFailed,
        },
      });

      return {
        module: "customers",
        organizationId: orgId,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        status: "SUCCESS",
      };
    } catch (err: any) {
      await zohoDb.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          recordsProcessed,
          recordsCreated,
          recordsUpdated,
          recordsFailed,
          errorMessage: err.message,
        },
      });
      return {
        module: "customers",
        organizationId: orgId,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        status: "FAILED",
        errorMessage: err.message,
      };
    }
  }

  async syncAll(options: SyncOptions = {}): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    const orgs = options.organizationId ? [options.organizationId] : this.activeOrganizations;
    const isFullSync = options.isFullSync ?? false;
    const triggerType = options.triggerType ?? "MANUAL";
    const modulesToSync = options.modules || ["quotations", "salesorders", "invoices", "payments", "customers"];

    for (const orgId of orgs) {
      if (modulesToSync.includes("quotations")) {
        const res = await this.syncQuotations(orgId, isFullSync, triggerType);
        results.push(res);
      }
      if (modulesToSync.includes("salesorders")) {
        const res = await this.syncSalesOrders(orgId, isFullSync, triggerType);
        results.push(res);
      }
      if (modulesToSync.includes("invoices")) {
        const res = await this.syncInvoices(orgId, isFullSync, triggerType);
        results.push(res);
      }
      if (modulesToSync.includes("payments")) {
        const res = await this.syncPayments(orgId, isFullSync, triggerType);
        results.push(res);
      }
      if (modulesToSync.includes("customers")) {
        const res = await this.syncCustomers(orgId, isFullSync, triggerType);
        results.push(res);
      }
    }

    return results;
  }
}
