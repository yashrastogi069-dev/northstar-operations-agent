export type AgentTaskType = "knowledge" | "research" | "analysis" | "draft" | "mixed";
export type AgentRiskTier = "low" | "review" | "blocked";
export type AgentToolName = "knowledge_search" | "public_research" | "structured_analysis" | "create_internal_draft";

export type AgentPlan = {
  objective: string;
  taskType: AgentTaskType;
  tools: AgentToolName[];
  needsApproval: boolean;
  approvalReason?: string;
};

export type PolicyDecision = {
  allowed: boolean;
  riskTier: AgentRiskTier;
  reason: string;
  taskType: AgentTaskType;
};

const BLOCKED_PATTERNS = /(?:ignore (?:all |previous |the )?instructions|reveal (?:a |the )?(?:secret|api key|password)|bypass (?:security|approval)|run (?:shell|terminal|command)|delete (?:all |the )?(?:data|files)|exfiltrat)/i;
const REVIEW_PATTERNS = /(?:send|email|post|publish|submit|update|change|create (?:a )?record|transfer|pay|purchase|delete|remove|invite|approve|reject)/i;

export const TOOL_CATALOG: Record<AgentToolName, { label: string; tier: 1 | 2; description: string; access: "read_only" | "draft_only" }> = {
  knowledge_search: { label: "Firm knowledge", tier: 1, access: "read_only", description: "Searches only approved firm sources available to the requesting role." },
  public_research: { label: "Public research", tier: 1, access: "read_only", description: "Searches a credential-free public reference source and returns cited snippets." },
  structured_analysis: { label: "Structured analysis", tier: 1, access: "read_only", description: "Analyses user-provided CSV or tabular text without sending it to an external tool." },
  create_internal_draft: { label: "Internal draft", tier: 2, access: "draft_only", description: "Creates an internal draft artifact. It never sends, publishes, or updates another system." },
};

export function classifyRequest(request: string, hasData = false): PolicyDecision {
  const normalized = request.trim();
  if (BLOCKED_PATTERNS.test(normalized)) {
    return { allowed: false, riskTier: "blocked", reason: "The request conflicts with the agent’s security, approval, or data-protection boundaries.", taskType: "mixed" };
  }
  const lower = normalized.toLowerCase();
  const taskType: AgentTaskType = hasData ? "analysis"
    : /(research|market|competitor|external|public|latest|news)/.test(lower) ? "research"
    : /(draft|write|prepare|summarize|brief|proposal)/.test(lower) ? "draft"
    : /(policy|procedure|firm|internal|knowledge|document|contract)/.test(lower) ? "knowledge"
    : "mixed";
  if (REVIEW_PATTERNS.test(normalized)) {
    return { allowed: true, riskTier: "review", reason: "The request can be researched and prepared as an internal draft, but any external or record-changing effect requires a human decision.", taskType };
  }
  return { allowed: true, riskTier: "low", reason: "The request is within the agent’s read-only or draft-only operating boundary.", taskType };
}

export function createDeterministicPlan(request: string, decision: PolicyDecision, hasData = false): AgentPlan {
  const lower = request.toLowerCase();
  const tools: AgentToolName[] = [];
  if (/(policy|procedure|firm|internal|knowledge|document|contract|our )/.test(lower)) tools.push("knowledge_search");
  if (/(research|market|competitor|external|public|latest|news|background)/.test(lower)) tools.push("public_research");
  if (hasData) tools.push("structured_analysis");
  if (/(draft|write|prepare|summarize|brief|proposal|email|send|publish|update)/.test(lower)) tools.push("create_internal_draft");
  if (!tools.length) tools.push("knowledge_search");
  return {
    objective: request.slice(0, 300),
    taskType: decision.taskType,
    tools: Array.from(new Set(tools)).slice(0, 4),
    needsApproval: decision.riskTier === "review",
    approvalReason: decision.riskTier === "review" ? "A requested future action could affect an external system or company record. Northstar will only prepare a reviewable internal draft." : undefined,
  };
}

export function validateToolInput(toolName: AgentToolName, input: { query?: string; dataText?: string; title?: string }) {
  if (toolName === "structured_analysis") return Boolean(input.dataText && input.dataText.length <= 200_000);
  if (toolName === "create_internal_draft") return Boolean(input.title && input.title.length <= 220);
  return Boolean(input.query && input.query.length >= 3 && input.query.length <= 2_000);
}
