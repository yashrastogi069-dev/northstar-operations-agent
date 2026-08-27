import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { addAuditEvent, createEvaluationCase, createEvaluationRun, getAuthorizedCandidates, listEvaluationCases } from "../db";
import { expandRetrievalQuery, generateEvidenceAnswer, rankEvidence, shouldDecline, tokenize } from "../lib/knowledge";
import { adminProcedure, router } from "../_core/trpc";

function answerSimilarity(expected: string | null, actual: string): number | null {
  if (!expected) return null;
  const expectedTerms = tokenize(expected);
  if (!expectedTerms.length) return null;
  const actualTerms = new Set(tokenize(actual));
  return Math.round((expectedTerms.filter(term => actualTerms.has(term)).length / expectedTerms.length) * 100);
}

export const evaluationRouter = router({
  list: adminProcedure.query(async () => listEvaluationCases()),
  create: adminProcedure.input(z.object({ name: z.string().trim().min(3).max(180), question: z.string().trim().min(3).max(4000), expectedAnswer: z.string().trim().max(8000).optional(), expectedDocumentId: z.number().int().positive().optional(), expectedBehavior: z.enum(["answer", "decline"]) })).mutation(async ({ ctx, input }) => {
    const caseId = await createEvaluationCase({ ...input, createdByUserId: ctx.user.id });
    await addAuditEvent({ actorUserId: ctx.user.id, eventType: "evaluation.case_created", entityType: "evaluation_case", entityId: caseId, details: { expectedBehavior: input.expectedBehavior } });
    return { caseId };
  }),
  run: adminProcedure.input(z.object({ caseId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const evaluationCase = (await listEvaluationCases()).find(item => item.id === input.caseId);
    if (!evaluationCase) throw new TRPCError({ code: "NOT_FOUND", message: "Evaluation case not found." });
    const evidence = rankEvidence(await expandRetrievalQuery(evaluationCase.question), await getAuthorizedCandidates(ctx.user.role));
    const declined = shouldDecline(evidence);
    const answer = declined ? "I don’t have sufficient approved evidence to answer that." : await generateEvidenceAnswer(evaluationCase.question, evidence);
    const behaviorPass = evaluationCase.expectedBehavior === "decline" ? declined : !declined;
    const retrievedDocumentIds = Array.from(new Set(evidence.map(item => item.documentId)));
    const retrievalPass = evaluationCase.expectedDocumentId ? retrievedDocumentIds.includes(evaluationCase.expectedDocumentId) : declined === (evaluationCase.expectedBehavior === "decline");
    const qualityScore = answerSimilarity(evaluationCase.expectedAnswer, answer);
    await createEvaluationRun({ caseId: input.caseId, answer, retrievedDocumentIds, retrievalPass, behaviorPass, notes: qualityScore === null ? "No reference answer supplied for lexical quality comparison." : `Reference-answer term coverage: ${qualityScore}%`, runByUserId: ctx.user.id });
    await addAuditEvent({ actorUserId: ctx.user.id, eventType: "evaluation.run_completed", entityType: "evaluation_case", entityId: input.caseId, severity: retrievalPass && behaviorPass ? "info" : "warning", details: { retrievalPass, behaviorPass, qualityScore, retrievedDocumentIds } });
    return { answer, evidence: evidence.map(item => ({ documentId: item.documentId, documentTitle: item.documentTitle, score: Math.round(item.rerankScore * 100) })), retrievalPass, behaviorPass, qualityScore };
  }),
});
