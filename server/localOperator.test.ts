import { describe, expect, it } from "vitest";
import { shouldUseLocalOperator } from "./_core/localOperator";

function request(host: string, remoteAddress = "127.0.0.1") {
  return {
    headers: { host },
    socket: { remoteAddress },
  } as never;
}

describe("local operator access boundary", () => {
  const enabled = { nodeEnv: "development", accessMode: "local-operator", noAuth: true };

  it("allows explicitly enabled loopback development requests", () => {
    expect(shouldUseLocalOperator(enabled, request("localhost:3004"))).toBe(true);
    expect(shouldUseLocalOperator(enabled, request("127.0.0.1:3004"))).toBe(true);
  });

  it("rejects production even when the local flag is present", () => {
    expect(shouldUseLocalOperator({ ...enabled, nodeEnv: "production" }, request("localhost:3004"))).toBe(false);
  });

  it("rejects non-loopback hosts and requests when the flag is absent", () => {
    expect(shouldUseLocalOperator(enabled, request("192.168.1.10:3004"))).toBe(false);
    expect(shouldUseLocalOperator({ ...enabled, noAuth: false }, request("localhost:3004"))).toBe(false);
  });
});
