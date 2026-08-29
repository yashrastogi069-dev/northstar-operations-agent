import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Start the configured OAuth/OIDC login. Call this from an event handler or
// effect at the moment you want to navigate, never during render.
//
// It has SIDE EFFECTS — it mints a one-time nonce, writes the __Host- state
// cookie, and navigates immediately — so the cookie nonce always matches the
// `state` it sends. Do NOT call it during render (no `href={startLogin()}` /
// `loginUrl={...}`): each call overwrites the cookie, so a stray render-phase
// call would desync it from an in-flight login and the callback would reject it
// with "invalid oauth state". It returns void by design, so there is no URL to
// stash across renders.
export const startLogin = () => {
  const provider = import.meta.env.VITE_AUTH_PROVIDER ?? "manus";
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const nonce = crypto.randomUUID();
  document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`;
  const state = encodeOAuthState({ redirectUri, nonce });

  if (provider === "oidc") {
    const issuerUrl = import.meta.env.VITE_OIDC_ISSUER_URL;
    const clientId = import.meta.env.VITE_OIDC_CLIENT_ID;
    if (!issuerUrl || !clientId) {
      throw new Error("External OIDC is enabled but VITE_OIDC_ISSUER_URL or VITE_OIDC_CLIENT_ID is missing");
    }
    const url = new URL(`${issuerUrl.replace(/\/$/, "")}/authorize`);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", import.meta.env.VITE_OIDC_SCOPE ?? "openid profile email");
    url.searchParams.set("state", state);
    if (import.meta.env.VITE_OIDC_AUDIENCE) {
      url.searchParams.set("audience", import.meta.env.VITE_OIDC_AUDIENCE);
    }
    window.location.href = url.toString();
    return;
  }

  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  window.location.href = url.toString();
};
