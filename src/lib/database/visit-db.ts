import { PrismaClient as VisitPrismaClient } from "@/generated/visit-client";

declare global {
  // eslint-disable-next-line no-var
  var visitPrisma: VisitPrismaClient | undefined;
}

const rawVisitDb =
  global.visitPrisma ||
  new VisitPrismaClient({
    log: ["error"],
  });

global.visitPrisma = rawVisitDb;

// Strict read-only enforcement at client layer to protect the existing Visit Management DB
export const visitDb = rawVisitDb.$extends({
  query: {
    $allModels: {
      async create() {
        throw new Error("Visit Database is strictly READ-ONLY. Create operations are forbidden.");
      },
      async createMany() {
        throw new Error("Visit Database is strictly READ-ONLY. CreateMany operations are forbidden.");
      },
      async update() {
        throw new Error("Visit Database is strictly READ-ONLY. Update operations are forbidden.");
      },
      async updateMany() {
        throw new Error("Visit Database is strictly READ-ONLY. UpdateMany operations are forbidden.");
      },
      async upsert() {
        throw new Error("Visit Database is strictly READ-ONLY. Upsert operations are forbidden.");
      },
      async delete() {
        throw new Error("Visit Database is strictly READ-ONLY. Delete operations are forbidden.");
      },
      async deleteMany() {
        throw new Error("Visit Database is strictly READ-ONLY. DeleteMany operations are forbidden.");
      },
    },
  },
});

export default visitDb;
