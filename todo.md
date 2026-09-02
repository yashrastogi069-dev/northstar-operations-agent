# Project TODO

- [x] Build one deployable LangGraph operations agent with deterministic policy gates and agentic specialist routing.
- [x] Add persistent run threads, graph-state snapshots, tool calls, trace events, and approval records.
- [x] Implement guarded tools for firm-knowledge retrieval, public research, structured-data analysis, and internal drafting.
- [x] Add a tool policy engine with allowlists, risk tiers, input validation, timeouts, rate limits, and no-write-by-default controls.
- [x] Add human approval interruptions for every consequential or connection-backed action.
- [x] Add RAG retrieval with a Qdrant-compatible vector-store adapter and safe local fallback.
- [x] Add workflow templates for research briefs, document analysis, operational triage, and draft preparation.
- [ ] Add agent evaluation datasets, trajectory checks, tool-use checks, output-quality checks, and user feedback.
- [ ] Add an observability workspace for run traces, step timing, tool outputs, costs, failures, and approval queues.
- [x] Build the focused agent workspace with task intake, agent runs, workflows, knowledge, approvals, evaluations, controls, and integration readiness.
- [x] Add public-safe architecture, deployment, and connection documentation with citations to current primary sources.
- [x] Add and run Vitest coverage for graph routing, policy gates, tool validation, workflow state, and access controls.
- [x] Create a public GitHub repository, push public-safe code only, and synchronize final changes.
- [x] Commit and push public-safe source after each major implementation milestone and before final delivery.
- [ ] Verify desktop and mobile UI, type safety, production build, and current runtime health before final release.
- [x] Fix LangGraph state-channel typing and run-trace iteration compatibility, then rerun the agent-runtime compile check.
- [x] Resolve the LangGraph plan-channel and plan-node naming collision, then rerun the complete agent regression suite.
- [x] Add a LangGraph workflow test for a review-tier request to verify the persisted graph reaches an approval-required state without an external action.
- [x] Fix the model-planning type import and rerun type validation before continuing the agent release checks.
- [x] Add owner-authorized post-run feedback signals and safety-report audit escalation.
- [x] Add controlled, idempotent fresh-run recovery for eligible failed read-only runs, with tabular input replay blocked for privacy.
- [x] Enforce user-memory privacy: ordinary administrators do not receive other users’ user-scoped memory.
- [ ] Attach Northstar to its own managed database, OAuth identity, and deployment; apply reviewed migrations only there.
- [ ] Complete a true durable LangGraph checkpointer and native interrupt/resume path before enabling any connected-system effect.
- [ ] Add trajectory, groundedness, citation, latency, token/cost, and refusal-quality evaluation measures using firm-approved test cases.
- [ ] Add configured embeddings and activate the optional Qdrant route only after a firm-approved vector processing boundary is supplied.
- [ ] Run authenticated desktop and mobile visual verification against Northstar’s dedicated deployment.
- [ ] Provision Northstar as a distinct managed web project with an independent database and OAuth identity; leave Atlas unchanged.
- [x] Review and apply the additive Northstar agent migrations 0002 through 0005 to the user-authorized shared test database; Atlas base migrations 0000 and 0001 were already present and were not rerun.
- [ ] Verify deployed authentication, database-backed protected procedures, and public deployment boundaries.
- [x] Record shared-test deployment readiness, synchronize public-safe source, and provide the temporary controlled test access path.
- [x] Perform controlled shared-environment testing using an isolated Northstar namespace while preserving every Atlas table and user-facing route.
- [x] Verify the live shared test service rejects unauthenticated protected agent routes with HTTP 401 and retains the isolated Northstar agent-table namespace.
- [ ] Prepare Northstar for a provider-compatible external deployment with no dependency on Manus-managed runtime services.
- [ ] Provision an externally hosted Node service and dedicated managed MySQL-compatible database under the user’s cloud account.
- [ ] Configure external OAuth, model provider, object storage, and production secrets without committing credentials.
- [ ] Deploy Northstar externally, run migrations, verify health and protected routes, and publish the production URL.
- [x] Produce a complete manual Railway deployment runbook for Northstar, including required external-provider substitutions for managed services.
- [x] Redesign Northstar with a high-contrast dark visual system so navigation, text, forms, results, and safety states are clearly visible.
- [ ] Verify the redesigned Northstar workspace at desktop and mobile breakpoints and re-run type and production-build checks.

- [x] Add Atlas-derived evidence functionality inside Northstar under a distinct name while keeping Atlas independent.
- [x] Add separate Evidence workspace navigation and preserve role-aware source controls, ingestion, hybrid retrieval, citations, feedback, audits, and draft-only workflows.
- [ ] Verify evidence authorization, retrieval, citations, workflow behavior, UI visibility, and that Atlas files/repository/database/deployment remain untouched.
- [x] Document and push the Northstar evidence-workspace addition as public-safe source.

- [x] Freeze Atlas as the independent reference and map its evidence capabilities into Northstar’s own namespaced modules.
- [x] Implement a separately named Northstar Evidence Desk with approved-source controls, ingestion, retrieval, citations, feedback, audits, evaluations, and draft-only evidence workflows.
- [x] Add Northstar Evidence Desk navigation and preserve the existing Northstar Agent Desk routes and controls.
- [ ] Add evidence parity, authorization, citation, audit, feedback, evaluation, and UI regression tests.
- [ ] Verify Atlas repository, database, deployment, and routes remain untouched; update documentation and push public-safe milestones.

- [ ] Add public-safe `.env.example` templates for Atlas and Northstar local Windows setup.
- [ ] Add one-click Windows CMD launchers named for Atlas and Northstar, plus optional launch-both helper, without credentials.
- [ ] Document Windows prerequisites, local database setup, environment values, ports, and safe local-run commands for both agents.
- [ ] Validate batch-script syntax and local build/test behavior, run repository hygiene checks, and push both repositories’ launcher updates.

- [x] Add a public-safe Northstar `.env.example` for local Windows setup.
- [x] Add a one-click Northstar Windows CMD launcher and local-run guide; leave Atlas unchanged.
- [x] Validate the Northstar launcher syntax, local commands, tests, build, and repository hygiene, then push the milestone.

- [x] Fix Northstar’s POSIX-only `NODE_ENV=...` package scripts so `pnpm dev` and `pnpm start` run in Windows CMD.
- [x] Update Northstar’s Windows local-run guide with the repaired commands and exact `.env` placeholder requirements.
- [x] Verify the Windows launcher structure, type checks, tests, build, and public-source hygiene, then push the startup fix.

- [x] Add provider-neutral external configuration for Auth0/OIDC, OpenAI-compatible LLM, and S3-compatible storage while retaining secure defaults.
- [x] Replace managed-only login, model, storage, and notification assumptions with explicit external adapters or safe unsupported states.
- [x] Add non-Manus configuration tests; the complete provider acquisition guide with official references is done.
- [x] Run dedicated external-adapter authorization tests and push the portability milestone; core type, behavior, build, local-start, and hygiene checks currently pass.

- [x] Document a Cloudflare Access protected route for Northstar with a simple email login policy and no public anonymous access.
- [x] Document a private Cloudflare R2 bucket, scoped API token, S3 endpoint, and Northstar storage variables.
- [x] Explain Cloudflare free-plan limits, ownership, DNS/domain prerequisites, and Railway integration in beginner-safe steps.
- [x] Validate the Cloudflare deployment instructions against official documentation and synchronize the public-safe guide.

- [x] Evaluate a local MySQL-compatible database path for Northstar on Windows with no hosted database dependency.
- [x] Evaluate a free self-hosted authentication path that can run locally without paid identity-provider quotas.
- [x] Define local backup, password-reset, email, data-retention, and security boundaries so “free forever” is not confused with unlimited capacity or zero maintenance.
- [x] Decide whether to implement local-only authentication mode separately from production OIDC/Cloudflare Access.

- [x] Add an explicit localhost-only local operator mode so Northstar can be entered without external OAuth during development.
- [x] Disable analytics initialization when local analytics variables are empty or unset, preventing literal placeholder URLs such as `%VITE_ANALYTICS_ENDPOINT%`.
- [x] Add focused tests for local operator authorization, production rejection, and analytics placeholder safety; rerun full checks and build.
- [x] Push the Northstar-only local access fix and document exact Windows restart steps.

- [x] Implement the approved Northstar-only localhost operator fix now, with fail-closed production behavior and analytics placeholder suppression.

- [x] Redesign Northstar navigation and information hierarchy so Agent Desk, Evidence Desk, Sources, Runs, and Admin workflows have clear locations and labels.
- [x] Improve Agent Desk readability and interaction flow with question/result pairing, clear status states, citations, consent prompts, and usable responsive spacing.
- [x] Improve Evidence Desk and Sources UX with a coherent upload/search/approval workflow, supported-format guidance, validation feedback, and readable source/document states.
- [x] Improve shared typography, contrast, spacing, panels, focus states, and responsive behavior across the Northstar application.
- [ ] Visually verify the redesigned UI at desktop and mobile widths, then rerun tests, type check, and production build before synchronizing the release.

- [ ] Diagnose the opaque failed Agent Desk run from the actual server error path and preserve safe read-only recovery behavior.
- [ ] Make missing optional `EMBEDDING_MODEL` and `OIDC_LOGOUT_URL` configuration explicit and backward-compatible, with clear runtime diagnostics.
- [ ] Add regression coverage, rerun tests/type/build checks, document exact Render environment updates, and push the troubleshooting fix.
