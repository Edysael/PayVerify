import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it("acepta rutas internas", () => {
    expect(safeNextPath("/auth/update-password")).toBe("/auth/update-password");
    expect(safeNextPath("/payments?x=1")).toBe("/payments?x=1");
  });
  it("rechaza destinos externos o vacíos", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
  });
});
