import { describe, expect, it } from "vitest";
import { shouldLoadAnalytics } from "./analytics";

describe("analytics configuration", () => {
  it("does not load when local variables are empty or missing", () => {
    expect(shouldLoadAnalytics(undefined, undefined)).toBe(false);
    expect(shouldLoadAnalytics("", "site-id")).toBe(false);
    expect(shouldLoadAnalytics("https://analytics.example", "")).toBe(false);
  });

  it("rejects unresolved Vite placeholders", () => {
    expect(shouldLoadAnalytics("/%VITE_ANALYTICS_ENDPOINT%", "%VITE_ANALYTICS_WEBSITE_ID%")).toBe(false);
  });

  it("accepts a complete configured endpoint and website id", () => {
    expect(shouldLoadAnalytics("https://analytics.example", "site-id")).toBe(true);
  });
});
