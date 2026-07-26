import { describe, it, expect, beforeEach } from "vitest";
import {
  isPlanId,
  priceIdFor,
  planForPriceId,
  plansConfigured,
  PLAN_IDS,
  PLANS,
} from "@/lib/plans";

describe("isPlanId", () => {
  it("accepts the three plan ids", () => {
    for (const id of PLAN_IDS) expect(isPlanId(id)).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isPlanId("gold")).toBe(false);
    expect(isPlanId(null)).toBe(false);
    expect(isPlanId(undefined)).toBe(false);
    expect(isPlanId(3)).toBe(false);
  });
});

describe("plan / price id mapping", () => {
  beforeEach(() => {
    process.env.STRIPE_PRICE_ID_BASIC = "price_basic";
    process.env.STRIPE_PRICE_ID_PRO = "price_pro";
    process.env.STRIPE_PRICE_ID_UNLIMITED = "price_unl";
  });

  it("priceIdFor returns the configured id", () => {
    expect(priceIdFor("basic")).toBe("price_basic");
    expect(priceIdFor("unlimited")).toBe("price_unl");
  });

  it("priceIdFor throws when the env var is unset", () => {
    delete process.env.STRIPE_PRICE_ID_PRO;
    expect(() => priceIdFor("pro")).toThrow();
  });

  it("planForPriceId maps a price back to its plan, or null", () => {
    expect(planForPriceId("price_pro")).toBe("pro");
    expect(planForPriceId("price_unknown")).toBe(null);
  });

  it("plansConfigured is true only when all three are set", () => {
    expect(plansConfigured()).toBe(true);
    delete process.env.STRIPE_PRICE_ID_UNLIMITED;
    expect(plansConfigured()).toBe(false);
  });
});

describe("PLANS monthly caps", () => {
  it("match the intended tiers", () => {
    expect(PLANS.basic.uploadsPerMonth).toBe(50);
    expect(PLANS.pro.uploadsPerMonth).toBe(250);
    expect(PLANS.unlimited.uploadsPerMonth).toBe(null);
  });
});
