import { getAuthorizedCandidates } from "../db";
import { rankEvidence, shouldDecline } from "./knowledge";
import type { AgentToolName } from "./agentPolicy";

export type AgentToolResult = {
  toolName: AgentToolName;
  status: "succeeded" | "failed" | "blocked";
  summary: string;
  citations: Array<{ title: string; source: string; excerpt: string; url?: string }>;
  data?: Record<string, unknown>;
  durationMs: number;
};

function truncate(value: string, max = 1_000) { return value.length > max ? `${value.slice(0, max)}…` : value; }

async function researchWikipedia(query: string): Promise<AgentToolResult> {
  const started = Date.now();
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "search");
  url.searchParams.set("srsearch", query.slice(0, 400));
  url.searchParams.set("srlimit", "4");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(7_500), headers: { "user-agent": "NorthstarOperationsAgent/1.0" } });
    if (!response.ok) throw new Error(`Reference search returned ${response.status}`);
    const body = await response.json() as { query?: { search?: Array<{ title: string; snippet: string; pageid: number }> } };
    const rows = body.query?.search ?? [];
    return { toolName: "public_research", status: "succeeded", summary: rows.length ? `Found ${rows.length} public reference result${rows.length === 1 ? "" : "s"}.` : "No public reference results found.", citations: rows.map(row => ({ title: row.title, source: "Wikipedia", excerpt: truncate(row.snippet.replace(/<[^>]+>/g, "").replace(/\s+/g, " "), 560), url: `https://en.wikipedia.org/?curid=${row.pageid}` })), durationMs: Date.now() - started };
  } catch (error) {
    return { toolName: "public_research", status: "failed", summary: `Public research was unavailable: ${error instanceof Error ? error.message : "unknown error"}`, citations: [], durationMs: Date.now() - started };
  }
}

async function searchFirmKnowledge(query: string, role: "admin" | "user"): Promise<AgentToolResult> {
  const started = Date.now();
  const evidence = rankEvidence(query, await getAuthorizedCandidates(role), 5);
  if (shouldDecline(evidence)) return { toolName: "knowledge_search", status: "succeeded", summary: "No sufficient approved firm evidence was found for this request.", citations: [], durationMs: Date.now() - started };
  return { toolName: "knowledge_search", status: "succeeded", summary: `Retrieved ${evidence.length} approved evidence passage${evidence.length === 1 ? "" : "s"}.`, citations: evidence.map(item => ({ title: item.documentTitle, source: item.sourceName, excerpt: item.snippet })), durationMs: Date.now() - started };
}

function analyseDelimitedData(dataText: string): AgentToolResult {
  const started = Date.now();
  const lines = dataText.trim().split(/\r?\n/).filter(Boolean).slice(0, 10_001);
  if (lines.length < 2) return { toolName: "structured_analysis", status: "failed", summary: "Structured analysis needs a header and at least one data row.", citations: [], durationMs: Date.now() - started };
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(delimiter).map(value => value.trim()).filter(Boolean).slice(0, 50);
  const rows = lines.slice(1).map(line => line.split(delimiter));
  const numeric: Record<string, { count: number; sum: number; min: number; max: number }> = {};
  headers.forEach((header, index) => rows.forEach(row => { const value = Number(row[index]?.trim()); if (Number.isFinite(value) && row[index]?.trim() !== "") { const item = numeric[header] ?? { count: 0, sum: 0, min: value, max: value }; item.count += 1; item.sum += value; item.min = Math.min(item.min, value); item.max = Math.max(item.max, value); numeric[header] = item; } }));
  const measures = Object.entries(numeric).slice(0, 8).map(([name, value]) => `${name}: n=${value.count}, total=${value.sum.toLocaleString()}, range=${value.min.toLocaleString()}–${value.max.toLocaleString()}`);
  return { toolName: "structured_analysis", status: "succeeded", summary: `Analysed ${rows.length.toLocaleString()} row${rows.length === 1 ? "" : "s"} across ${headers.length} column${headers.length === 1 ? "" : "s"}.${measures.length ? ` ${measures.join("; ")}.` : " No numeric columns were detected."}`, citations: [], data: { rowCount: rows.length, headers, numeric }, durationMs: Date.now() - started };
}

export async function executeAgentTool(toolName: AgentToolName, input: { query: string; role: "admin" | "user"; dataText?: string; title?: string }): Promise<AgentToolResult> {
  if (toolName === "knowledge_search") return searchFirmKnowledge(input.query, input.role);
  if (toolName === "public_research") return researchWikipedia(input.query);
  if (toolName === "structured_analysis") return analyseDelimitedData(input.dataText ?? "");
  return { toolName: "create_internal_draft", status: "succeeded", summary: "Internal draft requested; final content is created only after evidence synthesis.", citations: [], durationMs: 0 };
}
