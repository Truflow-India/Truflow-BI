import { PrismaClient as ZohoPrismaClient } from "@/generated/zoho-client";

declare global {
  // eslint-disable-next-line no-var
  var rawZohoPrisma: ZohoPrismaClient | undefined;
}

const rawClient =
  global.rawZohoPrisma ||
  new ZohoPrismaClient({
    log: ["error"],
  });

global.rawZohoPrisma = rawClient;

// Auto-retry wrapper for Neon Serverless cold-starts & transient connection drops
export const zohoDb = rawClient.$extends({
  query: {
    async $allOperations({ operation, model, args, query }) {
      try {
        return await query(args);
      } catch (error: any) {
        // If it is a transient connection error (P1001, P1002, P1017, or "Can't reach database server"), retry after 1.5s
        if (
          error?.code === "P1001" ||
          error?.code === "P1002" ||
          error?.code === "P1017" ||
          error?.message?.includes("Can't reach database server") ||
          error?.message?.includes("Connection closed")
        ) {
          console.warn(
            `[ZohoDb] Transient Neon connection error on ${model || "query"}.${operation}, retrying after compute wake-up...`
          );
          await new Promise((resolve) => setTimeout(resolve, 1500));
          return await query(args);
        }
        throw error;
      }
    },
  },
});

export default zohoDb;
