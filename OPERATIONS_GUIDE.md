# Operating Northstar

Northstar is a single, deployable operations agent. It is built for firm knowledge work that needs controlled multi-step execution rather than a generic conversational interface. The agent accepts a business request, evaluates the request against deterministic controls, assembles context, constructs a bounded task plan, invokes only registered tools, synthesizes a result from collected evidence, and creates a review record when a proposed future effect needs human authority.

## What runs today

| Capability | Implementation | Operating boundary |
|---|---|---|
| Request and business context | Typed task intake plus scoped explicit memories. | Prompt injection, secret extraction, shell commands, destructive requests, and approval bypass attempts are blocked before planning. |
| LangGraph orchestration | `StateGraph` transitions: policy → context → planning → tools → synthesis, with conditional blocked route. | The policy node runs before any tool node. |
| Firm knowledge | Approved-source hybrid retrieval inherited from the verified evidence module. | Draft and archived sources never enter retrieval; user roles are checked before chunks are returned. |
| Public research | Read-only Wikipedia API query with a 7.5-second timeout and source URLs. | No user-supplied URL fetching and no authenticated browsing. |
| Structured data | Local CSV or tab-delimited text profiling. | No code execution, data writes, or external data transfer. |
| Draft preparation | Internal agent artifact plus an optional approval record. | It cannot send, publish, update a CRM, or modify an external system. |
| State and memory | Database-backed run, snapshot, tool-call, approval, artifact, and explicit memory records. | Tool output and retrieved content do not become durable memory automatically. |
| Recovery | LangGraph node timeout and bounded retry policy; tool-specific retry for transient public research failure. | A run that cannot complete is recorded as failed for review. |
| Evaluation | Administrator-only policy and tool-route scoring with retained results. | Test cases can verify allow, review, and block behavior before a capability expands. |
| Observability | Run trace screen, tool ledger, durable snapshots, audit events, status, timing, and retry fields. | Sensitive values are redacted from tool summaries. |

## Deploying the agent

The application is a Node/React project. Provision a managed deployment with a MySQL/TiDB-compatible database, object storage, and the existing OAuth and model-service environment values. Apply the committed migrations in order, including `drizzle/0002_brainy_carmella_unuscione.sql` and `drizzle/0003_minor_magma.sql`, before routing users to the agent. The production build is validated with `pnpm build`; standard checks are `pnpm check` and `pnpm test`.

> Do not commit `.env` files, connection strings, API keys, uploaded documents, customer data, or raw trace payloads. The public repository intentionally contains only application code, migrations, tests, and public-safe documentation.

## Activating firm knowledge

First create a named source with an owner, classification, and access level. An administrator uploads reviewed files, confirms ingestion completed, and changes the source to **approved**. The agent then retrieves only ready documents from approved sources. Build a representative evaluation suite before making the source broadly available.

## Activating external connections

An administrator should activate one connection at a time. Start with SharePoint or Google Drive in read-only mode, specify the exact sites, folders, or resource scopes, and test results against a small evaluation set. For CRM, Slack, or Teams, begin in draft-only mode. Any future external write requires a narrowly scoped tool, a requested approval record, an idempotency key, a post-action audit record, and a clear failure/recovery behavior. Northstar’s current release does **not** register any direct external-write tool.

## Evaluation and release gate

The first evaluation pack should contain at least one legitimate knowledge request, one public research request, one structured-data request, one draft-producing request, one request that must pause for review, one irrelevant or insufficient-evidence request, one prompt-injection attempt, and one access-boundary test. Review policy pass rate, correct tool selection, refusal quality, retrieval relevance, response grounding, and latency. Do not introduce a new tool or connection until its targeted cases behave consistently.

## Sources

The technical structure follows LangGraph’s explicit state, persistence, human-in-the-loop, memory, and observability model; LangChain’s tool and custom workflow guidance; the OWASP AI Agent Security Cheat Sheet; and NIST’s AI Risk Management Framework.[1] [2] [3] [4]

[1]: https://docs.langchain.com/oss/python/langgraph/overview "LangGraph overview"
[2]: https://docs.langchain.com/oss/python/langchain/multi-agent "LangChain multi-agent documentation"
[3]: https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html "OWASP AI Agent Security Cheat Sheet"
[4]: https://www.nist.gov/itl/ai-risk-management-framework "NIST AI Risk Management Framework"
