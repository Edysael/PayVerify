import { describe, expect, it } from "vitest";
import { buildTrend, formatPercent, initials, niceScale, parseRange, percentChange, share, timeAgo } from "./dashboard";

const TZ = "America/Caracas";

describe("dashboard", () => {
  it("parses the range with a safe default", () => {
    expect(parseRange("7")).toBe(7);
    expect(parseRange("30")).toBe(30);
    expect(parseRange("99")).toBe(14);
    expect(parseRange(undefined)).toBe(14);
  });
  it("buckets payments per local day and counts reconciled ones", () => {
    const now = new Date("2026-11-27T15:00:00Z"); // 11:00 en Caracas
    const t = buildTrend([
      { transaction_date: "2026-11-27T14:00:00Z", verification_status: "RECONCILED" },
      { transaction_date: "2026-11-27T13:00:00Z", verification_status: "RECEIVED_BY_SERVER" },
      { transaction_date: "2026-11-27T02:00:00Z", verification_status: "RECONCILED" }, // 26 nov 22:00 en Caracas
      { transaction_date: "2026-10-01T00:00:00Z", verification_status: "RECONCILED" }, // fuera de rango
    ], 3, now, TZ);
    expect(t.map((p) => p.key)).toEqual(["2026-11-25", "2026-11-26", "2026-11-27"]);
    expect(t.map((p) => [p.registered, p.reconciled])).toEqual([[0, 0], [1, 1], [2, 1]]);
    expect(t[2].label).toMatch(/27/);
  });
  it("computes percentages", () => {
    expect(percentChange(112, 100)).toBeCloseTo(12);
    expect(percentChange(5, 0)).toBeNull();
    expect(share(1201, 1248)).toBeCloseTo(96.23, 1);
    expect(share(0, 0)).toBeNull();
    expect(formatPercent(12.4, true)).toBe("+12,4%");
    expect(formatPercent(-3, true)).toBe("-3,0%");
    expect(formatPercent(96.23)).toBe("96,2%");
  });
  it("formats relative time", () => {
    const now = new Date("2026-11-27T15:00:00Z");
    expect(timeAgo("2026-11-27T14:57:00Z", now)).toBe("Hace 3 min");
    expect(timeAgo("2026-11-27T12:00:00Z", now)).toBe("Hace 3 h");
    expect(timeAgo("2026-11-26T15:00:00Z", now)).toBe("Hace 1 día");
  });
  it("builds a round Y scale", () => {
    expect(niceScale(127)).toEqual({ max: 140, step: 20 });
    expect(niceScale(0)).toEqual({ max: 7, step: 1 });
    expect(niceScale(3).max).toBeGreaterThanOrEqual(3);
  });
  it("builds initials", () => {
    expect(initials("Edgardo Moya")).toBe("EM");
    expect(initials("edgardo")).toBe("ED");
  });
});
