import { describe, expect, it } from "vitest";
import { readerState } from "./reader";

const now = new Date("2026-11-28T15:00:00Z");
const ago = (m: number) => new Date(now.getTime() - m * 60000).toISOString();

describe("readerState", () => {
  it("receiving only with recent heartbeat and capture on", () => {
    expect(readerState({ device_status: "active", last_heartbeat_at: ago(1), capture_active: true }, now).tone).toBe("green");
    expect(readerState({ device_status: "active", last_heartbeat_at: ago(1), capture_active: false }, now).label).toBe("Pausado");
    expect(readerState({ device_status: "active", last_heartbeat_at: ago(8), capture_active: true }, now).tone).toBe("red");
    expect(readerState({ device_status: "active", last_heartbeat_at: null, capture_active: false }, now).label).toBe("Nunca conectado");
  });
  it("handles pending, revoked and missing migration", () => {
    expect(readerState({ device_status: "pending" }, now).tone).toBe("amber");
    expect(readerState({ device_status: "revoked", last_heartbeat_at: ago(1), capture_active: true }, now).tone).toBe("gray");
    expect(readerState({ device_status: "active" }, now).label).toBe("Sin datos");
  });
});
