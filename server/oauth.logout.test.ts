import { describe, expect, it } from "vitest";
import { buildOidcLogoutUrl } from "./_core/oauth";

describe("OIDC RP-initiated logout", () => {
  const request = { protocol: "https", get: () => "northstar.example.com" } as never;

  it("builds an Auth0-compatible logout URL with a same-origin return target", () => {
    const value = buildOidcLogoutUrl(request, { authProvider: "oidc", issuerUrl: "https://tenant.us.auth0.com", clientId: "client-123", logoutUrl: "" });
    expect(value).toContain("https://tenant.us.auth0.com/v2/logout?");
    expect(value).toContain("client_id=client-123");
    expect(value).toContain("returnTo=https%3A%2F%2Fnorthstar.example.com%2F");
  });

  it("supports a configured generic end-session endpoint", () => {
    const value = buildOidcLogoutUrl(request, { authProvider: "oidc", issuerUrl: "https://issuer.example.com", clientId: "client-123", logoutUrl: "https://issuer.example.com/connect/endsession" });
    expect(value).toContain("post_logout_redirect_uri=https%3A%2F%2Fnorthstar.example.com%2F");
  });

  it("does not create an external logout redirect for the legacy path", () => {
    expect(buildOidcLogoutUrl(request, { authProvider: "manus", issuerUrl: "https://issuer.example.com", clientId: "client-123", logoutUrl: "" })).toBeUndefined();
  });
});
