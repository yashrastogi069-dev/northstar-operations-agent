# Second Agent Research Notes

## Official LangChain and LangGraph findings

- LangChain distinguishes the agent harness (model, tools, prompt, and middleware) from LangGraph, which is the lower-level choice for advanced workflows combining deterministic and agentic steps. Source: https://docs.langchain.com/oss/python/langchain/overview
- LangGraph supports stateful orchestration with graph state, nodes, edges, and conditional edges. Its custom agentic RAG example uses retrieval, document grading, question rewriting, and answer generation as explicit graph stages. Source: https://docs.langchain.com/oss/python/langgraph/agentic-rag
- Human-in-the-loop design depends on persistent graph state and a stable thread identifier. Dynamic interrupts can pause a graph before sensitive steps and resume only when a reviewer submits a decision. Effects that occur before an interrupt must be idempotent because the node starts again on resume. Source: https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/
- The official LangGraph project positions durable execution, memory, streaming, human oversight, and customizable single- or multi-agent workflows as key production features. Source: https://www.langchain.com/langgraph

## Architecture implications

1. Build a focused operations agent instead of a generic autonomous assistant. Use a deterministic intake and policy gate before model-led tool selection.
2. Use a graph with explicit stages: intake -> risk classification -> planning -> bounded tool execution -> evidence verification -> human approval queue when an external effect is proposed -> final response.
3. Persist thread state, tool calls, approvals, and trace events in the application database. Keep all mutable actions draft-only by default.
4. Separate retrieval tools (firm knowledge), analytical tools (structured data), public research tools, and integration adapters. Each has an allowlist, bounded inputs/outputs, timeout, audit record, and policy tier.
5. Keep integrations disabled until the firm grants least-privilege credentials. The first live integrations should be read-only or draft-only.

## Retrieval and evaluation findings

- LangGraph's agentic RAG tutorial describes a graph that decides whether to retrieve, grades retrieved documents, rewrites a question when evidence is weak, and then generates an answer. It uses document loaders, chunking, embeddings, vector stores, nodes, edges, and conditional routing. Source: https://docs.langchain.com/oss/python/langgraph/agentic-rag
- Qdrant's LangGraph agentic RAG guide uses more than one vector source and routes a question to the most relevant store or to web search. This supports a federated retrieval design rather than one undifferentiated knowledge base. Source: https://qdrant.tech/documentation/tutorials-build-essentials/agentic-rag-langgraph/
- LangSmith evaluation guidance separates offline examples from online production monitoring. It calls out retrieval relevance and answer quality for RAG systems, and tool choice, tool arguments, and trajectory for agents. Source: https://docs.langchain.com/langsmith/evaluation-concepts

## Chosen practical direction

Build **Northstar Operations Agent**, a separate stateful workflow agent for firm operations. It will use explicit graph-state transitions rather than a generic chatbot loop. The initial graph will classify intent and risk, create a bounded task plan, select from approved tools (firm knowledge search, structured-data analysis, public research, and internal draft creation), verify outputs, and interrupt for human review before any connection-backed or consequential action. The app will ship with a local persistent state/traces layer and an optional Qdrant-compatible vector adapter, rather than requiring a live vector-service credential on day one.

## Framework and coordination findings

- The official product comparison identifies LangGraph as the right layer for lower-level control, durable execution, persistence, and complex workflows that combine deterministic and agentic steps. LangChain is the higher-level framework for model, tool, and middleware abstractions; Deep Agents is a more opinionated harness. Source: https://docs.langchain.com/oss/python/concepts/products
- LangGraph documents deterministic workflows, dynamic agents, routing, parallel work, prompt chaining, and orchestrator-worker structures. It distinguishes predetermined workflow paths from dynamic tool-using agents. Source: https://docs.langchain.com/oss/python/langgraph/workflows-agents
- LangChain's multi-agent guidance recommends using a single agent when suitable and treating multi-agent patterns as a context-engineering choice. The relevant production patterns are subagents, router, skills, handoffs, and custom workflows. Source: https://docs.langchain.com/oss/python/langchain/multi-agent

## Architecture decision

Use **LangGraph as the primary orchestration runtime**, with LangChain tool interfaces and structured-output prompts. Do not begin with an uncontrolled multi-agent swarm. Implement a supervisory graph with deterministic policy nodes and a small number of context-isolated specialist nodes: research, firm knowledge/RAG, data analysis, and document-draft preparation. The supervisor can parallelize independent research and data tasks but never exposes external write tools without a graph pause and explicit human approval. This balances current production capability with maintainability, testability, and cost control.

## Safety, memory, recovery, and operations findings

- OWASP recommends least-privilege tool sets, per-tool read/write and resource scoping, separate tool sets across trust levels, and explicit authorization for sensitive operations. It identifies prompt injection, tool abuse, data exfiltration, memory poisoning, excessive autonomy, and denial of wallet as key risks. Source: https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html
- LangGraph's current overview groups production agent needs around persistence, human-in-the-loop, short-term and long-term memory, tracing, evaluation, and production deployment. Source: https://docs.langchain.com/oss/python/langgraph/overview

## Required controls for the single practical agent

1. A non-LLM policy gate validates task intent, user role, requested tools, data sensitivity, allowed action tier, input size, and execution budget before agent planning.
2. The agent stores short-term run state and opt-in task memories separately. Untrusted tool results and retrieved documents are treated as data, never as instructions, and are not persisted as long-term preferences without a user or administrator decision.
3. Read-only tools may execute only from a named allowlist. Draft-producing tools are allowed to create internal artifacts. External writes, messaging, record updates, payments, destructive commands, and broad file access are blocked until a human approves a specific, auditable proposal.
4. Every node records a trace event with run ID, inputs/outputs summary, allowed tool decision, timing, result, error class, and retry count. Failed recoverable nodes use bounded retries with idempotency keys; unrecoverable runs become reviewable failed cases.
5. Evaluation covers intent routing, permission decisions, tool selection and argument correctness, retrieval relevance and groundedness, workflow completion, refusal quality, and user feedback. Production monitoring tracks error rate, latency, tool failures, approval outcomes, and safety-block rate.
