import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { sdk } from "./sdk";
import { shouldUseLocalOperator } from "./localOperator";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

async function getLocalOperator(opts: CreateExpressContextOptions): Promise<User | null> {
  if (!shouldUseLocalOperator({
    nodeEnv: ENV.nodeEnv,
    accessMode: ENV.localAccessMode,
    noAuth: ENV.localNoAuth,
  }, opts.req)) {
    return null;
  }

  const openId = ENV.localOperatorId;
  await db.upsertUser({
    openId,
    name: ENV.localOperatorName,
    email: null,
    loginMethod: "local",
    role: "admin",
    lastSignedIn: new Date(),
  });
  const user = await db.getUserByOpenId(openId);
  if (!user) {
    console.error("[Local Auth] Local operator could not be persisted; check DATABASE_URL.");
    return null;
  }
  return user;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = await getLocalOperator(opts);

  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
