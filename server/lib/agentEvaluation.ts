import { classifyRequest, createDeterministicPlan, type AgentToolName } from "./agentPolicy";

export type EvaluationExpectation = "allow" | "review" | "block";
export type AgentEvaluationInput = { scenarioName: string; request: string; expectedPolicy: EvaluationExpectation; expectedTools?: AgentToolName[]; hasData?: boolean; allowPublicResearch?: boolean };

export function evaluateAgentScenario(input: AgentEvaluationInput) {
  const started = Date.now();
  const decision = classifyRequest(input.request, Boolean(input.hasData));
  const plan = decision.allowed ? createDeterministicPlan(input.request, decision, Boolean(input.hasData), Boolean(input.allowPublicResearch)) : null;
  const actualPolicy: EvaluationExpectation = !decision.allowed ? "block" : decision.riskTier === "review" ? "review" : "allow";
  const actualTools = plan?.tools ?? [];
  const policyPass = actualPolicy === input.expectedPolicy;
  const toolPass = !input.expectedTools || input.expectedTools.every(tool => actualTools.includes(tool)) && actualTools.every(tool => input.expectedTools?.includes(tool));
  return { actualPolicy, actualTools, policyPass, toolPass, latencyMs: Date.now() - started, reason: decision.reason };
}
