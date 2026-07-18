import { describe, it, expect } from "vitest";
import { cadenceDays } from "@/lib/customer-alerts";

describe("cadenceDays", () => {
  it("maps each known frequency to its day count", () => {
    expect(cadenceDays("פעם בשבוע")).toBe(7);
    expect(cadenceDays("פעמיים בשבוע")).toBe(3.5);
    expect(cadenceDays("פעמיים בחודש")).toBe(15);
    expect(cadenceDays("פעם בחודש")).toBe(30);
    expect(cadenceDays("פעם בחודשיים")).toBe(60);
    expect(cadenceDays("פעם ב-3 חודשים")).toBe(90);
  });

  it("falls back to monthly for unknown/empty input", () => {
    expect(cadenceDays("")).toBe(30);
    expect(cadenceDays(null)).toBe(30);
    expect(cadenceDays(undefined)).toBe(30);
    expect(cadenceDays("bogus")).toBe(30);
  });
});
