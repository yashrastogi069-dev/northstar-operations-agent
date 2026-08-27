import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "admin" | "user" | null): TrpcContext {
  return {
    user: role ? {
      id: 21,
      openId: "authorization-test-user",
      name: "Authorization test user",
      email: "test@example.com",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("knowledge-agent procedure authorization", () => {
  it("rejects access to protected knowledge procedures without a signed-in user", async () => {
    const caller = appRouter.createCaller(contextFor(null));
    await expect(caller.knowledge.workspace()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.knowledge.sources.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("blocks an ordinary user before any administrator-only source or evaluation action can run", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.knowledge.sources.create({ name: "Restricted policy", classification: "restricted", accessLevel: "admins_only" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.evaluation.create({ name: "Test", question: "Can I access this?", expectedBehavior: "decline" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.knowledge.workflows.review({ draftId: 1, status: "approved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
