// @ts-expect-error Bun provides this runtime module; the service does not install Bun type declarations.
import { expect, spyOn, test } from "bun:test";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import PricingService from "./pricing.service";

test("syncIfStale logs and rethrows repository failures", async () => {
  const failure = new Error("D1 read failed");
  const db = {
    select: () => ({
      from: () => Promise.reject(failure),
    }),
  } as unknown as DrizzleD1Database;
  const errorSpy = spyOn(console, "error").mockImplementation(() => undefined);

  try {
    await expect(PricingService.syncIfStale(db)).rejects.toBe(failure);
    expect(errorSpy).toHaveBeenCalledWith(
      "[ve-track][pricing] syncIfStale failed",
      failure,
    );
  } finally {
    errorSpy.mockRestore();
  }
});
