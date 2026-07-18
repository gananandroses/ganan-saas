import { describe, it, expect } from "vitest";
import {
  VAT_RATE,
  VAT_MULTIPLIER,
  toGross,
  toNet,
  vatOfGross,
  vatOfNet,
  jobGross,
  jobNet,
} from "@/lib/vat";

describe("VAT rate", () => {
  it("is the current Israeli rate of 18%", () => {
    expect(VAT_RATE).toBe(0.18);
    expect(VAT_MULTIPLIER).toBeCloseTo(1.18, 10);
  });
});

describe("gross/net conversions", () => {
  it("adds and strips VAT symmetrically", () => {
    expect(toGross(100)).toBeCloseTo(118, 10);
    expect(toNet(118)).toBeCloseTo(100, 10);
    // round-trip: net -> gross -> net returns the original
    expect(toNet(toGross(250))).toBeCloseTo(250, 10);
  });

  it("computes the VAT portion consistently", () => {
    expect(vatOfNet(100)).toBeCloseTo(18, 10);
    expect(vatOfGross(118)).toBeCloseTo(18, 10);
    // net + VAT(net) === gross
    expect(100 + vatOfNet(100)).toBeCloseTo(toGross(100), 10);
  });
});

describe("job price helpers", () => {
  it("treats price_before_vat=true as net (adds VAT for gross)", () => {
    expect(jobGross(100, true)).toBe(118);
    expect(jobNet(100, true)).toBe(100);
  });

  it("treats price_before_vat=false as gross (already includes VAT)", () => {
    expect(jobGross(118, false)).toBe(118);
    expect(jobNet(118, false)).toBe(100);
  });

  it("guards against non-finite prices", () => {
    expect(jobGross(NaN, true)).toBe(0);
    expect(jobNet(Infinity, false)).toBe(0);
  });
});
