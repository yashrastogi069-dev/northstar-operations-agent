import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { evaluationRouter } from "./routers/evaluation";
import { agentRouter } from "./routers/agent";
import { knowledgeRouter } from "./routers/knowledge";
import { buildOidcLogoutUrl } from "./_core/oauth";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true, logoutUrl: buildOidcLogoutUrl(ctx.req) } as const;
    }),
  }),
  knowledge: knowledgeRouter,
  evaluation: evaluationRouter,
  agent: agentRouter,
});

export type AppRouter = typeof appRouter;
