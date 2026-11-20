/**
 * Business Intelligence Dashboard - Standard Formatters
 * Safe for both Server Components and Client Components
 */

export function formatIndianCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return "₹0";
  }
  if (Math.abs(amount) >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCount(count: number): string {
  if (isNaN(count) || count === null || count === undefined) {
    return "0";
  }
  return new Intl.NumberFormat("en-IN").format(count);
}

export function formatPercentage(value: number): string {
  if (isNaN(value) || value === null || value === undefined) {
    return "0.0%";
  }
  return `${value.toFixed(1)}%`;
}

