/**
 * Zoho Books API Client
 * Provides rate-limit resilient, typed API operations for Zoho Books v3.
 */

import { getZohoAccessToken } from "./auth";

const BASE_URL = process.env.ZOHO_API_BASE_URL || "https://www.zohoapis.com/books/v3";

export interface PaginationParams {
  page?: number;
  per_page?: number;
  last_modified_time?: string; // Format: YYYY-MM-DDTHH:MM:SS+0530
}

export interface ZohoPageContext {
  page: number;
  per_page: number;
  has_more_page: boolean;
  total?: number;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  page_context?: ZohoPageContext;
  [key: string]: any;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, backoffMs = 1000): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        // Rate limited
        const wait = backoffMs * attempt;
        console.warn(`[Zoho API] Rate limited (429). Retrying in ${wait}ms (attempt ${attempt}/${retries})...`);
        await new Promise((res) => setTimeout(res, wait));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Zoho API HTTP ${response.status}: ${errorText}`);
      }

      const json = await response.json();
      if (json.code !== 0) {
        throw new Error(`Zoho API Error (${json.code}): ${json.message}`);
      }

      return json;
    } catch (err: any) {
      if (attempt === retries) throw err;
      const wait = backoffMs * attempt;
      console.warn(`[Zoho API] Request failed: ${err.message}. Retrying in ${wait}ms...`);
      await new Promise((res) => setTimeout(res, wait));
    }
  }
}

export class ZohoBooksClient {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  private async request<T = any>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const token = await getZohoAccessToken();
    const url = new URL(`${BASE_URL}/${endpoint}`);
    url.searchParams.append("organization_id", this.organizationId);

    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        url.searchParams.append(key, String(val));
      }
    }

    return fetchWithRetry(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Fetch Quotations (Estimates) page
   */
  async getEstimates(params: PaginationParams = {}): Promise<{ estimates: any[]; page_context?: ZohoPageContext }> {
    const res = await this.request<{ estimates: any[]; page_context?: ZohoPageContext }>("estimates", params);
    return {
      estimates: res.estimates || [],
      page_context: res.page_context,
    };
  }

  /**
   * Fetch Sales Orders page
   */
  async getSalesOrders(params: PaginationParams = {}): Promise<{ salesorders: any[]; page_context?: ZohoPageContext }> {
    const res = await this.request<{ salesorders: any[]; page_context?: ZohoPageContext }>("salesorders", params);
    return {
      salesorders: res.salesorders || [],
      page_context: res.page_context,
    };
  }

  /**
   * Fetch Invoices page
   */
  async getInvoices(params: PaginationParams = {}): Promise<{ invoices: any[]; page_context?: ZohoPageContext }> {
    const res = await this.request<{ invoices: any[]; page_context?: ZohoPageContext }>("invoices", params);
    return {
      invoices: res.invoices || [],
      page_context: res.page_context,
    };
  }

  /**
   * Fetch Customer Payments page
   */
  async getCustomerPayments(params: PaginationParams = {}): Promise<{ customerpayments: any[]; page_context?: ZohoPageContext }> {
    const res = await this.request<{ customerpayments: any[]; page_context?: ZohoPageContext }>("customerpayments", params);
    return {
      customerpayments: res.customerpayments || [],
      page_context: res.page_context,
    };
  }

  /**
   * Fetch Contacts (Customers) page
   */
  async getContacts(params: PaginationParams = {}): Promise<{ contacts: any[]; page_context?: ZohoPageContext }> {
    const res = await this.request<{ contacts: any[]; page_context?: ZohoPageContext }>("contacts", params);
    return {
      contacts: res.contacts || [],
      page_context: res.page_context,
    };
  }
}
