import { describe, it, expect } from "vitest";
import { haversineKm } from "@/lib/geocoding";

describe("haversineKm", () => {
  it("is zero for identical points", () => {
    expect(haversineKm({ lat: 32.08, lng: 34.78 }, { lat: 32.08, lng: 34.78 })).toBe(0);
  });

  it("is symmetric", () => {
    const a = { lat: 32.0853, lng: 34.7818 }; // Tel Aviv
    const b = { lat: 31.7683, lng: 35.2137 }; // Jerusalem
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });

  it("approximates the Tel Aviv – Jerusalem distance (~54 km)", () => {
    const tlv = { lat: 32.0853, lng: 34.7818 };
    const jlm = { lat: 31.7683, lng: 35.2137 };
    const d = haversineKm(tlv, jlm);
    expect(d).toBeGreaterThan(50);
    expect(d).toBeLessThan(60);
  });
});
