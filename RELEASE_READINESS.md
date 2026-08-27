# Northstar Operations Agent — Release Readiness Report

**Author:** Manus AI  
**Scope:** A single supervised LangChain/LangGraph operations agent for governed firm knowledge, bounded research and analysis, internal drafting, human review, and operational traceability.  
**Repository:** [yashrastogi069-dev/northstar-operations-agent](https://github.com/yashrastogi069-dev/northstar-operations-agent)

## Executive assessment

Northstar is a focused operations agent rather than a chatbot or a generic multi-agent platform. A business request flows through an explicit LangGraph `StateGraph`: **policy → context → bounded planning → registered tools → evidence synthesis**, with a blocked branch that terminates before planning or tool use. LangChain structured tools provide typed interfaces, while deterministic authorization and input controls retain control over every capability the model may use.[1] [2]

The current source is **production-oriented and deployment-ready in code**, but it is **not yet safe to label as a live firm deployment**. It needs its own managed database, OAuth identity, and deployment configuration; the reviewed migration sequence must be applied only to that new Northstar database. Connected systems and optional vector retrieval remain deliberately disabled until the firm approves the relevant providers, scopes, classifications, and credentials.

| Release dimension | Current status | Evidence / limitation |
|---|---|---|
| Focused agent workflow | Implemented | One LangGraph graph and four governed operation templates; not an uncontrolled agent swarm. |
| Tool safety | Implemented | Four allowlisted tools: approved knowledge search, bounded public reference research, local tabular analysis, and internal draft creation. No shell, browser control, database write, CRM write, email send, or destructive tool exists. |
| Approval boundary | Implemented for drafts | Review-tier work creates a named approval record and internal draft only. Approval records do not execute external actions. |
| Recovery | Implemented for eligible read-only failures | Fresh, auditable successor run; duplicate recovery blocked. Tabular data is intentionally not replayed. |
| Memory privacy | Implemented | User-scoped memory is limited to its owner, including from ordinary administrators. Firm-scoped memory is role-filtered. |
| Vector route | Implemented but dormant | Qdrant REST adapter has required source filters, HTTPS, timeout, and response-side filtering; no automatic embedding creation or document export. |
| Evaluation and feedback | Partially implemented | Quantitative policy/tool-route evaluation plus run feedback and safety escalation exist. Groundedness, citation, cost, and trajectory scoring require firm test cases. |
| Deployment identity and database | Pending | A dedicated Northstar managed project, database, OAuth app identity, and migration application are still required. |
| Native durable interrupt/resume | Pending | Current snapshots and approvals are application-managed. Native LangGraph checkpointer and `interrupt()`/`Command(resume=...)` integration is a prerequisite for connected-system effects.[3] |

## Implemented execution contract

Northstar always classifies a request before model planning. Attempts to override instructions, retrieve credentials, bypass approval, invoke shell commands, remove data, or exfiltrate information are blocked at the policy node. Requests that imply a future email, publication, record change, payment, transfer, or similar effect may be researched and rendered as an **internal draft**, but the run moves to `awaiting_approval`; no outside-system effect is available.

The planning node may use a structured model response only to select an ordered subset of the deterministic policy-approved tool candidates. It cannot add tools, grant permissions, generate a URL for fetching, execute code, or authorize an action. Invalid or unavailable planner output transparently falls back to the deterministic plan. This tool-authority separation follows the least-privilege and explicit-authorization principles emphasized in OWASP’s agent guidance.[4]

| Capability | Practical behavior today | Boundary enforced |
|---|---|---|
| Firm knowledge | Searches only ready documents in approved sources, with role-aware access filters. | Draft and archived sources do not enter retrieval. |
| Public research | Queries a bounded Wikipedia reference endpoint with a 7.5-second timeout and cited snippets. | No arbitrary user URL, authenticated browsing, or outbound credentials. |
| Structured analysis | Profiles pasted CSV/tab-delimited data locally. | No code execution and no third-party transfer. |
| Internal drafting | Produces an artifact from the bounded evidence result. | Never sends, publishes, or updates a record. |
| Long-term memory | Explicit user or firm memory is injected deliberately, never auto-created from retrieval or tool output. | Ordinary administrators cannot read another user’s private memory. |
| Observability | Run/thread metadata, snapshots, tool ledger, policy trace, approval record, retry lineage, artifacts, feedback, and audit events. | Tool summaries redact obvious secret patterns; raw credentials are not retained. |

## Failure recovery and human review

The agent retries transient public-reference failures once within the bounded graph. If an execution still fails, its failure state is retained. A user may start one controlled recovery for an eligible failed read-only or draft-only request. Recovery creates a new thread and carries a `recoveryOfRunId` lineage link; it does not rerun a prior action in place. This limits duplicate behavior and keeps the audit history understandable.

> **Important:** Approval is a review signal, not an authorization to act generally. In this release, a reviewed approval only completes or cancels the internal draft workflow. It never releases a connector action because no external-write connector is registered.

## Optional vector retrieval

Northstar retains its approved-source hybrid retrieval as its safe default. The repository additionally contains a real, dormant Qdrant REST query adapter. The adapter requires an HTTPS Qdrant endpoint and API key held outside source control, a bounded vector and collection name, and a non-empty list of source IDs already authorized by Northstar. It applies that list to the Qdrant payload filter and filters result payloads again before returning them. This uses Qdrant’s payload filtering model as a defence-in-depth measure.[5]

The firm must first approve the embedding provider, whether document content or embeddings may leave the firm boundary, the Qdrant service terms and region, retention policy, and a collection schema containing `sourceId`. Northstar does not create embeddings, upload firm documents, or turn on the vector route automatically.

## Verification performed

The following checks were executed against the current source on **August 27, 2026**. Tests use mocked network/model/database dependencies for deterministic safety and authorization behavior; no firm data, credentials, or production records were used.

| Check | Result | Coverage confirmed |
|---|---:|---|
| TypeScript type check | Passed | `pnpm check` completed without TypeScript errors. |
| Unit and router suite | Passed | **48 assertions** across **15 test files**. |
| Production build | Passed | `pnpm build` produced client and server bundles. |
| Tool and policy tests | Passed | Injection/credential blocks, review classification, allowlisted tool plans, bounded inputs, structured local analysis. |
| Graph tests | Passed | Blocked requests stop before tools; review-tier requests become `awaiting_approval` with draft-only behavior. |
| Recovery tests | Passed | Analysis replay rejected, duplicate recovery rejected, and eligible recovery creates a new audited successor. |
| Memory/feedback router tests | Passed | Non-admin firm-memory creation rejected; feedback requires run visibility; safety feedback creates high-severity audit record. |
| Vector adapter tests | Passed | Disabled-by-default behavior, required source filter, server-side result filter, and result limit verified. |
| Built-service smoke test | Passed, unauthenticated | A production build served the Northstar sign-in boundary with the intended agent branding. Authenticated end-to-end testing is pending a dedicated OAuth identity. |

The production bundle emitted a non-blocking Vite warning that the main JavaScript chunk exceeds 500 kB. The build completed successfully. Code-splitting secondary operator pages is a recommended performance improvement before broad rollout, not a release blocker for controlled pilot use.

## Safe activation gate

Provision Northstar independently; do not reuse or migrate the completed Atlas Evidence Agent database. Apply migrations `0000` through `0005` to the new Northstar database in order. Configure a dedicated OAuth application identity, production domain, database connection, object storage, and server-side model service. Then perform authenticated role tests, migration verification, and a controlled pilot with only approved documents.

Before enabling an external integration or vector store, add it one at a time in read-only or draft-only mode, restrict it to named resources, test it against the firm’s evaluation pack, and review its audit records. Before enabling any connected-system effect, replace application-managed approval pausing with a durable LangGraph checkpointer and native interrupt/resume flow; LangGraph’s documentation describes the persistence and human-in-the-loop primitives relevant to that hardening step.[1] [3]

## References

[1]: https://docs.langchain.com/oss/javascript/langgraph/overview "LangGraph overview"
[2]: https://docs.langchain.com/oss/javascript/langchain/overview "LangChain overview"
[3]: https://docs.langchain.com/oss/javascript/langgraph/interrupts "LangGraph interrupts"
[4]: https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html "OWASP AI Agent Security Cheat Sheet"
[5]: https://qdrant.tech/documentation/concepts/filtering/ "Qdrant filtering documentation"
