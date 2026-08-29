import { COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE, decodeOAuthState } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { ENV } from "./env";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function safeCallbackForRequest(req: Request, redirectUri: string): boolean {
  try {
    const url = new URL(redirectUri);
    const host = req.get("host");
    const origin = `${req.protocol}://${host}`;
    return url.origin === origin && url.pathname === "/api/oauth/callback";
  } catch {
    return false;
  }
}

function oidcEndpoint(path: string): string {
  if (!ENV.oidcIssuerUrl) throw new Error("OIDC_ISSUER_URL is not configured");
  return `${ENV.oidcIssuerUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

async function exchangeOidcCode(code: string, redirectUri: string) {
  if (!ENV.oidcClientId || !ENV.oidcClientSecret) {
    throw new Error("OIDC_CLIENT_ID or OIDC_CLIENT_SECRET is not configured");
  }
  const response = await fetch(oidcEndpoint("oauth/token"), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: ENV.oidcClientId,
      client_secret: ENV.oidcClientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!response.ok) throw new Error(`OIDC token exchange failed (${response.status})`);
  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) throw new Error("OIDC token response missing access_token");
  return payload.access_token;
}

async function getOidcUserInfo(accessToken: string) {
  const response = await fetch(oidcEndpoint("userinfo"), {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`OIDC userinfo failed (${response.status})`);
  const payload = (await response.json()) as {
    sub?: string;
    name?: string;
    email?: string;
    preferred_username?: string;
  };
  if (!payload.sub) throw new Error("OIDC userinfo missing sub");
  return {
    openId: `oidc:${payload.sub}`,
    name: payload.name || payload.preferred_username || payload.email || payload.sub,
    email: payload.email ?? null,
  };
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    const { nonce, redirectUri } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce || !safeCallbackForRequest(req, redirectUri)) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });

    try {
      const userInfo = ENV.authProvider === "oidc"
        ? await getOidcUserInfo(await exchangeOidcCode(code, redirectUri))
        : await sdk.getUserInfo((await sdk.exchangeCodeForToken(code, state)).accessToken);

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: ENV.authProvider === "oidc"
          ? "oidc"
          : ((userInfo as { loginMethod?: string | null; platform?: string | null }).loginMethod
              ?? (userInfo as { platform?: string | null }).platform
              ?? null),
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });
      res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
