/**
 * Cross-System Customer & Salesperson Correlation Service
 * Implements strict, auditable matching rules between Zoho Books and Visit Management DB.
 */

import { zohoDb } from "../database/zoho-db";
import { visitDb } from "../database/visit-db";

export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  // Strip non-digits
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length > 10) return digits.slice(-10);
  return null;
}

export function normalizeEmail(raw?: string | null): string | null {
  if (!raw) return null;
  const clean = raw.trim().toLowerCase();
  return clean.includes("@") ? clean : null;
}

export function cleanCompanyName(raw?: string | null): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replace(/\b(private|pvt|limited|ltd|solutions|technologies|corporation|corp|enterprises|engg|engineering)\b/gi, "")
    .replace(/[^a-z0-9]/gi, "")
    .trim();
}

export interface MatchResult {
  totalZohoCustomers: number;
  totalVisitCustomers: number;
  matchedCount: number;
  phoneMatches: number;
  emailMatches: number;
  nameMatches: number;
}

export async function runCustomerCorrelation(): Promise<MatchResult> {
  const zohoCustomers = await zohoDb.zohoCustomer.findMany();
  const visitCustomers = await visitDb.customer.findMany({
    select: {
      id: true,
      name: true,
      companyName: true,
      phone: true,
      email: true,
    },
  });

  // Pre-index Visit Customers by normalized phone, email, and normalized name
  const phoneIndex = new Map<string, string>();
  const emailIndex = new Map<string, string>();
  const nameIndex = new Map<string, string>();

  for (const vc of visitCustomers) {
    const normPhone = normalizePhone(vc.phone);
    if (normPhone) phoneIndex.set(normPhone, vc.id);

    const normEmail = normalizeEmail(vc.email);
    if (normEmail) emailIndex.set(normEmail, vc.id);

    const normName = cleanCompanyName(vc.name || vc.companyName);
    if (normName && normName.length >= 4) {
      nameIndex.set(normName, vc.id);
    }
  }

  let matchedCount = 0;
  let phoneMatches = 0;
  let emailMatches = 0;
  let nameMatches = 0;

  for (const zc of zohoCustomers) {
    let visitCustomerId: string | null = null;
    let matchType: "PHONE_EXACT" | "EMAIL_EXACT" | "NAME_EXACT" | null = null;
    let confidence = 0;

    // 1. Phone match (Highest reliability)
    const zPhone = normalizePhone(zc.phone) || normalizePhone(zc.mobile);
    if (zPhone && phoneIndex.has(zPhone)) {
      visitCustomerId = phoneIndex.get(zPhone)!;
      matchType = "PHONE_EXACT";
      confidence = 1.0;
      phoneMatches++;
    }

    // 2. Email match (High reliability)
    if (!visitCustomerId && zc.email) {
      const zEmail = normalizeEmail(zc.email);
      if (zEmail && emailIndex.has(zEmail)) {
        visitCustomerId = emailIndex.get(zEmail)!;
        matchType = "EMAIL_EXACT";
        confidence = 1.0;
        emailMatches++;
      }
    }

    // 3. Exact clean company name match (Validated minimum 4 chars)
    if (!visitCustomerId) {
      const zName = cleanCompanyName(zc.companyName || zc.customerName);
      if (zName && zName.length >= 4 && nameIndex.has(zName)) {
        visitCustomerId = nameIndex.get(zName)!;
        matchType = "NAME_EXACT";
        confidence = 0.85;
        nameMatches++;
      }
    }

    if (visitCustomerId && matchType) {
      matchedCount++;
      await zohoDb.customerMapping.upsert({
        where: { zohoCustomerId: zc.zohoCustomerId },
        create: {
          zohoCustomerId: zc.zohoCustomerId,
          visitCustomerId,
          matchType,
          confidence,
          verified: confidence >= 0.85,
        },
        update: {
          visitCustomerId,
          matchType,
          confidence,
          verified: confidence >= 0.85,
        },
      });
    }
  }

  return {
    totalZohoCustomers: zohoCustomers.length,
    totalVisitCustomers: visitCustomers.length,
    matchedCount,
    phoneMatches,
    emailMatches,
    nameMatches,
  };
}

/**
 * Returns a salesperson mapping dictionary linking rep names/emails to Visit DB Employee IDs.
 */
export async function getSalespersonMapping(): Promise<Map<string, { employeeId: string; name: string; email: string }>> {
  const employees = await visitDb.employee.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const mapping = new Map<string, { employeeId: string; name: string; email: string }>();

  for (const emp of employees) {
    const user = emp.user;
    if (!user) continue;

    const record = {
      employeeId: emp.id,
      name: user.name,
      email: user.email,
    };

    // Index by email (lowercase)
    mapping.set(user.email.toLowerCase(), record);

    // Index by name (lowercase trimmed)
    mapping.set(user.name.toLowerCase().trim(), record);

    // Common abbreviations / first names (e.g., 'Arun Kumar', 'Gangadharan', 'Rohit', 'Sabarish', 'Kumar')
    const firstName = user.name.split(" ")[0].toLowerCase();
    if (firstName.length >= 4 && !mapping.has(firstName)) {
      mapping.set(firstName, record);
    }
  }

  return mapping;
}
